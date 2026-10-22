const { Op } = require('sequelize');
const db = require('../database/models');
const shopSettingsService = require('./shopSettings.service');
const { toCoordinate, toPoint, distanceKm, formatKm } = require('../utils/geo');
const { buyerWhere, buyerColumns, buyerOwnsOrder, buyerActor } = require('../utils/shopBuyer');
const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;

/* ------------------------------------------------------------------ *\
 * Bill math — must stay in lock-step with the frontend's `cartTotals`
 * (my-naai-web/src/lib/shopOrders.js). Blinkit-style shipping: a flat
 * fee below the threshold, free above it.
 *
 * The rules come from the single-row shop_settings table (admin-managed
 * via /api/shop-settings/admin-update); the env vars are only the seed
 * defaults for a settings row that has never been written:
 *   SHOP_DELIVERY_FEE        (default 49)
 *   SHOP_FREE_DELIVERY_ABOVE (default 499)
 * ------------------------------------------------------------------ */
const DELIVERY_FEE = Math.max(0, Number(process.env.SHOP_DELIVERY_FEE) || 49);
const FREE_DELIVERY_ABOVE = Number(process.env.SHOP_FREE_DELIVERY_ABOVE) || 499;

// A raw line without qty is read as one; the bill math must never emit NaN.
const lineQty = (line) => Math.max(1, Math.min(99, Math.round(Number(line?.qty) || 1)));

const clampPercent = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(100, n);
};

// A settings value, with the env default as fallback for unset rows.
const settingsNumber = (settings, field, fallback) => {
  const n = Number(settings?.[field]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

// `method` ('COD' | 'ONLINE') decides whether the COD surcharge is added.
// The free-delivery threshold applies to the AFTER-DISCOUNT subtotal, so
// admin-managed discount and free-delivery rules compose predictably.
const computeTotals = (lines = [], settings = {}, method = 'COD') => {
  const freeAbove = settingsNumber(settings, 'freeDeliveryAbove', FREE_DELIVERY_ABOVE);
  const fee = settingsNumber(settings, 'deliveryFee', DELIVERY_FEE);
  const discountPercent = clampPercent(settings?.discountPercent);
  const codCharges = settingsNumber(settings, 'codCharges', 0);

  const itemTotal = lines.reduce((sum, line) => sum + (Number(line?.price) || 0) * lineQty(line), 0);
  const savings = lines.reduce((sum, line) => sum + Math.max(0, (Number(line?.mrp) || 0) - (Number(line?.price) || 0)) * lineQty(line), 0);
  const discount = Math.round((itemTotal * discountPercent) / 100);
  const subtotal = itemTotal - discount;
  const deliveryFee = !lines.length || subtotal >= freeAbove ? 0 : fee;
  const codFee = method === 'COD' ? codCharges : 0;
  return {
    itemCount: lines.reduce((sum, line) => sum + lineQty(line), 0),
    itemTotal,
    savings,
    discount,
    subtotal,
    deliveryFee,
    codFee,
    total: subtotal + deliveryFee + codFee,
    freeDeliveryAbove: freeAbove,
    deliveryFeeBase: fee,
    discountPercent
  };
};

// Same id format the frontend generates ('MN' + base36 time + 4 chars) so an
// order placed through the API looks like one placed through the web shop.
const ORDER_ID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const generateOrderId = () => {
  let suffix = '';
  for (let i = 0; i < 4; i += 1) {
    suffix += ORDER_ID_CHARS[Math.floor(Math.random() * ORDER_ID_CHARS.length)];
  }
  return `MN${Date.now().toString(36).toUpperCase()}${suffix}`;
};

/* ------------------------------------------------------------------ *\
 * Two status tracks. The INTERNAL track drives fulfilment (who has the
 * parcel); the CUSTOMER track is what the buying salon sees, derived from
 * the internal one — the salon never sees warehouse internals.
 * ------------------------------------------------------------------ */
const INTERNAL_STATUSES = ['PENDING_ASSIGNMENT', 'AWAITING_ACCEPTANCE', 'ASSIGNED', 'PICKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const INTERNAL_TO_CUSTOMER_STATUS = {
  PENDING_ASSIGNMENT: 'PENDING',
  AWAITING_ACCEPTANCE: 'PENDING',
  ASSIGNED: 'CONFIRMED',
  PICKED: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
};

// The customer track only moves forward (never PENDING -> CONFIRMED ->
// PENDING when a distributor is swapped or rejects) — except CANCELLED,
// which always wins. A paid order sits at CONFIRMED from placement, so a
// rejection must not drag it back to PENDING.
const CUSTOMER_STATUS_ORDER = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
const nextCustomerStatus = (current, derived) => {
  if (derived === 'CANCELLED' || current === 'CANCELLED') return 'CANCELLED';
  const from = CUSTOMER_STATUS_ORDER.indexOf(current);
  const to = CUSTOMER_STATUS_ORDER.indexOf(derived);
  return to > from ? derived : current;
};

// Append an audit event. Best-effort on purpose: the state change itself is
// the source of truth and must not be rolled back because the log write
// failed — a missing row is visible in the log, a wrong order state is not.
const logEvent = (order, { actorType, actorId = null, actorLabel = null, action, fromStatus = null, toStatus = null, note = null }) => {
  return db.ShopOrderEvent.create({
    orderId: order.id,
    actorType,
    actorId: actorId == null ? null : String(actorId),
    actorLabel,
    action,
    fromStatus,
    toStatus,
    note
  }).catch((error) => {
    console.error(`[shop-order-events] failed to log ${action} for ${order.orderId}:`, error.message);
  });
};

// Rupee formatting for error messages (thousands as in India).
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

/**
 * Create a shop order. Amounts are always recomputed from the lines —
 * the client's `amounts` payload is ignored on purpose. A client-supplied
 * `orderId` is honoured (the web shop creates its local record first, so
 * both ends share the id); otherwise one is generated.
 *
 * The COD limit (shop_settings.codThreshold) is enforced here as well as in
 * the checkout UI — a tampered client cannot order COD above it.
 */
const createOrder = async ({ buyerType, buyerId, isSalon, orderId, items, address, payment, notes }) => {
  const method = payment?.method === 'ONLINE' ? 'ONLINE' : 'COD';
  const settings = await shopSettingsService.getSettings();

  // The COD limit is enforced HERE, not just in the checkout UI — a tampered
  // client cannot slip past it. Judged on the item total (0 = no limit).
  const amounts = computeTotals(items, settings, method);
  if (method === 'COD' && settings.codThreshold > 0 && amounts.itemTotal > settings.codThreshold) {
    throw new Error(
      `Cash on delivery is available only for orders of ${inr(settings.codThreshold)} or less — this one is ${inr(amounts.itemTotal)}. Please pay online.`
    );
  }
  const paid = method === 'ONLINE' && payment?.status === 'PAID';

  // The delivery point, decided once and stored on the order:
  //   1. a SALON order: the salon's own coordinates (the server's truth — a
  //      client cannot claim a different delivery city to shave its KM),
  //      else the address pin the client sent;
  //   2. a CUSTOMER order: the pin the client sent. A customer has no
  //      standing address on file, so there is nothing to look up — and
  //      inventing one would send the parcel to the wrong door.
  // Everything downstream (KM on assignment, the admin map, the distributor
  // portal) reads these two columns, so fulfilment is identical for both.
  let salon = null;
  let customer = null;
  let deliveryPoint = null;

  if (isSalon) {
    salon = await db.Salon.findByPk(buyerId, { attributes: ['salonName', 'latitude', 'longitude', 'addressLine1', 'city'] });
    deliveryPoint = toPoint({ latitude: salon?.latitude, longitude: salon?.longitude })
      || toPoint({ latitude: address?.latitude, longitude: address?.longitude });
  } else {
    deliveryPoint = toPoint({ latitude: address?.latitude, longitude: address?.longitude });
    // Snapshot who bought it; the users row keeps the account's current name
    // and phone so the admin and the delivery partner know who the parcel is
    // for without a second lookup.
    customer = await db.User.findByPk(buyerId, { attributes: ['userId', 'fullName', 'phoneNumber'] });
  }

  const order = await db.ShopOrder.create({
    orderId: orderId || generateOrderId(),
    // Writes buyerType + exactly one of salonId / customerId.
    ...buyerColumns({ buyerType, buyerId }),
    items,
    // Coordinates never live inside the address snapshot (the salon's address
    // text must not silently change); they get their own columns below.
    address: address ? { name: address.name, phone: address.phone, line1: address.line1, city: address.city, state: address.state, pincode: address.pincode } : address,
    deliveryLatitude: deliveryPoint ? deliveryPoint.latitude : null,
    deliveryLongitude: deliveryPoint ? deliveryPoint.longitude : null,
    payment: {
      method,
      status: paid ? 'PAID' : 'PENDING',
      paymentId: payment?.paymentId || '',
      amount: amounts.total
    },
    amounts,
    // Every order starts waiting for a delivery partner; a paid order is
    // already confirmed on the customer side.
    status: 'PENDING_ASSIGNMENT',
    customerStatus: paid ? 'CONFIRMED' : 'PENDING',
    notes: notes || null
  });

  // First entries of the audit record: the order arrived on the central
  // dashboard, and (if paid) the payment is confirmed. The actor is whoever
  // bought it — the admin timeline renders the same row for both buyers.
  const actor = buyerActor(
    { buyerType, buyerId },
    isSalon ? (salon?.salonName || 'Salon') : (customer?.fullName || 'Customer')
  );
  await logEvent(order, { ...actor, action: 'ORDER_PLACED', toStatus: order.status, note: method === 'ONLINE' ? 'Order placed (online payment)' : 'Order placed (cash on delivery)' });
  if (paid) {
    await logEvent(order, { ...actor, action: 'PAYMENT_CONFIRMED', toStatus: order.customerStatus });
  }
  return order;
};

/* ------------------------------------------------------------------ *\
 * Delivery location + distance
 *
 * Every fulfilment payload (admin, distributor) names the point the parcel is
 * going to and how far the assigned partner is from it. The salon sees the
 * point (it is the salon's own address) but never the partner's distance or
 * identity — the two tracks stay separate, as they always were.
 * ------------------------------------------------------------------ */

const DELIVERY_LOCATION_SOURCES = {
  ORDER: 'ORDER',
  SALON: 'SALON'
};

// The point the parcel is going to. The order snapshot wins; a salon moved
// after placement is only a fallback, so history stays truthful.
const deliveryLocationOf = (order) => {
  const raw = order?.toJSON ? order.toJSON() : (order || {});
  const fromOrder = toPoint({ latitude: raw.deliveryLatitude, longitude: raw.deliveryLongitude });
  if (fromOrder) return { ...fromOrder, source: DELIVERY_LOCATION_SOURCES.ORDER, hasLocation: true };
  const fromSalon = toPoint({ latitude: raw.salon?.latitude, longitude: raw.salon?.longitude });
  if (fromSalon) return { ...fromSalon, source: DELIVERY_LOCATION_SOURCES.SALON, hasLocation: true };
  return { latitude: null, longitude: null, source: null, hasLocation: false };
};

/**
 * The fulfilment view of an order (admin + distributor portal):
 *   deliveryLocation { latitude, longitude, source, hasLocation }
 *   distributor.distanceKm (km from the partner's stored location to the
 *                  delivery point, null when either end is unknown)
 *   distributor.hasLocation / locationUpdatedAt
 * The salon payload never passes through here.
 */
const decorateForFulfilment = (order) => {
  if (!order) return null;
  const plain = order.toJSON ? order.toJSON() : { ...order };
  const deliveryLocation = deliveryLocationOf(plain);
  plain.deliveryLocation = deliveryLocation;
  if (plain.distributor) {
    const distance = distanceKm(plain.distributor, deliveryLocation);
    plain.distributor = {
      ...plain.distributor,
      latitude: toCoordinate(plain.distributor.latitude),
      longitude: toCoordinate(plain.distributor.longitude),
      hasLocation: Boolean(toPoint(plain.distributor)),
      distanceKm: distance
    };
  }
  return plain;
};

/**
 * A buyer's own order history — a salon's or a customer's, decided by the
 * token. Everything except the `where` is the shared list: same pagination,
 * same newest-first order, same payload.
 */
const listForBuyer = async ({ buyer, page = 1 } = {}) => {
  const limit = DEFAULT_LIMIT;
  const safePage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
  const offset = (safePage - 1) * limit;

  const { count: totalOrders, rows: orders } = await db.ShopOrder.findAndCountAll({
    where: buyerWhere(buyer),
    include: [
      { model: db.Salon, as: 'salon', attributes: ['salonId', 'salonName', 'latitude', 'longitude'] },
      { model: db.User, as: 'customer', attributes: ['userId', 'fullName', 'phoneNumber'] }
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset
  });

  return {
    orders,
    pagination: { page: safePage, limit, totalOrders, totalPages: Math.ceil(totalOrders / limit) || 0 }
  };
};

// Kept for any caller that still has a bare salon id.
const listForSalon = (salonId, page = 1) => listForBuyer({
  buyer: { buyerType: 'SALON', buyerId: salonId, isSalon: true },
  page
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getById = async (orderIdOrId, { withEvents = false, buyer = null } = {}) => {
  const where = { orderId: orderIdOrId };
  if (UUID_RE.test(String(orderIdOrId))) {
    where[Op.or] = [{ orderId: orderIdOrId }, { id: orderIdOrId }];
  }
  const include = [
    // Coordinates travel with both ends of the delivery: the salon's (the
    // delivery location) and the distributor's (the dispatch location).
    { model: db.Salon, as: 'salon', attributes: ['salonId', 'salonName', 'phoneNumber', 'latitude', 'longitude', 'addressLine1', 'city'] },
    // A customer order has no salon, so the buyer's name/phone come from here.
    { model: db.User, as: 'customer', attributes: ['userId', 'fullName', 'phoneNumber'] },
    {
      model: db.Distributor,
      as: 'distributor',
      attributes: ['distributorId', 'name', 'phone', 'area', 'deliveryCapability', 'latitude', 'longitude', 'locationUpdatedAt']
    }
  ];
  if (withEvents) {
    include.push({
      model: db.ShopOrderEvent,
      as: 'events',
      separate: true,
      order: [['createdAt', 'ASC'], ['id', 'ASC']]
    });
  }
  const order = await db.ShopOrder.findOne({ where, include });
  if (!order) return null;
  // Internal callers (admin, distributor, webhook) pass no buyer and keep
  // reading every order. A buyer's own request must match the token — an
  // order that is not theirs answers exactly like a missing id.
  if (buyer && !buyerOwnsOrder(buyer, order)) return null;
  return order;
};

// The Razorpay webhook correlates a captured payment with an order by the
// payment id the client stored on the order.
const findByPaymentId = async (paymentId) => {
  return await db.ShopOrder.findOne({ where: { payment: { paymentId } } });
};

// Admin: request a delivery partner for the order (assignment and
// re-assignment both go through here). A fresh or rejected order moves
// PENDING_ASSIGNMENT -> AWAITING_ACCEPTANCE and waits for the distributor to
// accept; an order that is already moving keeps its internal status and just
// swaps the partner. Every action lands in the event record.
const assignDistributor = async (orderIdOrId, distributorId, note, actor = {}, distributor = null) => {
  const order = await getById(orderIdOrId);
  if (!order) return null;
  if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
    throw new Error(`Order can no longer be assigned (status: ${order.status})`);
  }
  // The distance the admin saw on the assign screen is written into the
  // permanent record, so "why this partner?" is answerable months later.
  const deliveryPoint = deliveryLocationOf(order);
  const distanceLabel = formatKm(distanceKm(distributor, deliveryPoint));

  const fromStatus = order.status;
  order.distributorId = distributorId;
  if (order.status === 'PENDING_ASSIGNMENT') {
    order.status = 'AWAITING_ACCEPTANCE';
  }
  order.customerStatus = nextCustomerStatus(order.customerStatus, INTERNAL_TO_CUSTOMER_STATUS[order.status]);
  if (note) order.notes = [order.notes, note].filter(Boolean).join('\n');
  await order.save();

  await logEvent(order, {
    ...actor,
    action: 'ASSIGNED',
    fromStatus,
    toStatus: order.status,
    note: [
      note,
      `Distributor requested: ${distributor?.name || distributorId}`,
      distanceLabel ? `${distanceLabel} from the delivery location` : 'delivery distance unknown (no coordinates)'
    ].filter(Boolean).join(' — ')
  });
  return order;
};

// Distributor (or the admin on their behalf): accept the order they were
// requested for. AWAITING_ACCEPTANCE -> ASSIGNED; the salon track moves to
// CONFIRMED (a paid order is already there).
const acceptOrder = async (orderIdOrId, actor = {}, distributor = null) => {
  const order = await getById(orderIdOrId);
  if (!order) return null;
  if (order.status !== 'AWAITING_ACCEPTANCE') {
    throw new Error(`Only an order awaiting distributor response can be accepted (status: ${order.status})`);
  }
  if (distributor && order.distributorId !== distributor.distributorId) {
    throw new Error('This order is not assigned to your distributor account');
  }

  const fromStatus = order.status;
  order.status = 'ASSIGNED';
  order.customerStatus = nextCustomerStatus(order.customerStatus, INTERNAL_TO_CUSTOMER_STATUS.ASSIGNED);
  await order.save();

  const who = distributor ? `Distributor ${distributor.name} accepted` : (actor.label ? `${actor.label} recorded acceptance for distributor ${order.distributor?.name || order.distributorId}` : 'Order accepted by distributor');
  await logEvent(order, { ...actor, action: 'ACCEPTED', fromStatus, toStatus: order.status, note: who });
  return order;
};

// Distributor (or the admin on their behalf): reject the order, with a
// reason. The order goes back to PENDING_ASSIGNMENT for re-assignment; the
// rejection reason is recorded in the event record. A paid order keeps its
// CONFIRMED customer status — the payment was real even if this delivery
// attempt was not.
const rejectOrder = async (orderIdOrId, reason, actor = {}, distributor = null) => {
  const order = await getById(orderIdOrId);
  if (!order) return null;
  if (order.status !== 'AWAITING_ACCEPTANCE') {
    throw new Error(`Only an order awaiting distributor response can be rejected (status: ${order.status})`);
  }
  if (distributor && order.distributorId !== distributor.distributorId) {
    throw new Error('This order is not assigned to your distributor account');
  }

  const fromStatus = order.status;
  const trimmedReason = (reason || '').trim();
  order.status = 'PENDING_ASSIGNMENT';
  order.distributorId = null;
  order.customerStatus = nextCustomerStatus(order.customerStatus, INTERNAL_TO_CUSTOMER_STATUS.PENDING_ASSIGNMENT);
  await order.save();

  const who = distributor ? `Distributor ${distributor.name} rejected` : (actor.label ? `${actor.label} recorded rejection by distributor ${order.distributor?.name || order.distributorId}` : 'Order rejected by distributor');
  await logEvent(order, { ...actor, action: 'REJECTED', fromStatus, toStatus: order.status, note: `${who} — reason: ${trimmedReason}` });
  return order;
};

// Distributor (or the admin on their behalf) advances an ACCEPTED order
// through the fulfilment chain: ASSIGNED -> PICKED -> SHIPPED -> DELIVERED.
// Only the next step is allowed — no skipping, no going back, no cancelling
// (that stays the salon's or admin's call). Re-sending the current status is
// a harmless no-op so a double-tap never errors.
const DISTRIBUTOR_PROGRESSION = [
  { from: 'ASSIGNED', to: 'PICKED', label: 'picked up' },
  { from: 'PICKED', to: 'SHIPPED', label: 'shipped' },
  { from: 'SHIPPED', to: 'DELIVERED', label: 'delivered' }
];

const distributorUpdateStatus = async (orderIdOrId, nextStatus, actor = {}, distributor = null) => {
  const step = DISTRIBUTOR_PROGRESSION.find(entry => entry.to === nextStatus);
  if (!step) {
    throw new Error('This order can only be moved to PICKED, SHIPPED or DELIVERED');
  }
  const order = await getById(orderIdOrId);
  if (!order) return null;
  if (distributor && order.distributorId !== distributor.distributorId) {
    throw new Error('This order is not assigned to your distributor account');
  }
  if (order.status === step.to) return order; // idempotent re-submit

  if (order.status !== step.from) {
    throw new Error(
      `This order must be ${step.from.replace(/_/g, ' ')} before it can be marked ${nextStatus.replace(/_/g, ' ')} (current: ${order.status.replace(/_/g, ' ')})`
    );
  }

  const fromStatus = order.status;
  order.status = nextStatus;
  order.customerStatus = nextCustomerStatus(order.customerStatus, INTERNAL_TO_CUSTOMER_STATUS[nextStatus]);
  await order.save();

  const who = distributor
    ? `Distributor ${distributor.name}`
    : (actor.label ? `${actor.label} for distributor ${order.distributor?.name || order.distributorId}` : 'Distributor');
  await logEvent(order, { ...actor, action: nextStatus, fromStatus, toStatus: nextStatus, note: `${who} marked the order ${step.label}` });
  return order;
};

// Admin: move the INTERNAL track; the customer track follows the mapping
// (and never regresses — see nextCustomerStatus). DELIVERED/CANCELLED are
// terminal; anything else may move forward, backward (a parcel goes back to
// the depot) or to CANCELLED.
const updateStatus = async (orderIdOrId, nextStatus, note, actor = {}) => {
  if (!INTERNAL_STATUSES.includes(nextStatus)) {
    throw new Error(`Unknown order status: ${nextStatus}`);
  }
  const order = await getById(orderIdOrId);
  if (!order) return null;
  if ((order.status === 'DELIVERED' || order.status === 'CANCELLED') && nextStatus !== 'DELIVERED') {
    throw new Error(`Order is terminal (status: ${order.status})`);
  }

  const fromStatus = order.status;
  order.status = nextStatus;
  order.customerStatus = nextCustomerStatus(order.customerStatus, INTERNAL_TO_CUSTOMER_STATUS[nextStatus]);
  if (nextStatus === 'CANCELLED') {
    order.cancelledAt = new Date();
    if (order.payment?.method === 'ONLINE' && order.payment?.status === 'PAID') {
      order.payment = { ...order.payment, status: 'REFUND_REQUESTED' };
    }
  }
  if (note) order.notes = [order.notes, note].filter(Boolean).join('\n');
  await order.save();

  await logEvent(order, { ...actor, action: nextStatus === 'CANCELLED' ? 'CANCELLED' : 'STATUS_CHANGED', fromStatus, toStatus: nextStatus, note: note || null });
  return order;
};

// Buyer self-service cancellation — allowed while the parcel has not left
// the depot (internal: PENDING_ASSIGNMENT / AWAITING_ACCEPTANCE / ASSIGNED /
// PICKED). Both tracks go terminal; a paid online order is flagged for a
// refund.
const cancelByBuyer = async (orderIdOrId, { buyer, reason } = {}) => {
  // Ownership first: an order that belongs to somebody else is "not found".
  const order = await getById(orderIdOrId, { buyer });
  if (!order) return null;
  if (order.status === 'CANCELLED') {
    throw new Error('Order is already cancelled');
  }
  if (!['PENDING_ASSIGNMENT', 'AWAITING_ACCEPTANCE', 'ASSIGNED', 'PICKED'].includes(order.status)) {
    throw new Error(`Order can no longer be cancelled (status: ${order.status})`);
  }
  const fromStatus = order.status;
  order.status = 'CANCELLED';
  order.customerStatus = 'CANCELLED';
  order.cancelledAt = new Date();
  order.cancelReason = (reason || '').trim();
  if (order.payment?.method === 'ONLINE' && order.payment?.status === 'PAID') {
    order.payment = { ...order.payment, status: 'REFUND_REQUESTED' };
  }
  await order.save();

  const cancelledBy = buyer && buyer.buyerType === 'CUSTOMER'
    ? buyerActor(buyer, order.customer?.fullName || 'Customer')
    : { actorType: 'SALON', actorId: order.salonId, actorLabel: order.salon?.salonName || 'Salon' };
  await logEvent(order, {
    ...cancelledBy,
    action: 'CANCELLED',
    fromStatus,
    toStatus: 'CANCELLED',
    note: order.cancelReason || (cancelledBy.actorType === 'CUSTOMER' ? 'Cancelled by customer' : 'Cancelled by salon')
  });
  return order;
};

// Kept for any caller that still has a bare salon id.
const cancelBySalon = (orderIdOrId, reason) => cancelByBuyer(orderIdOrId, {
  buyer: null,
  reason
});

// Company admin: every salon's orders. Filters: status (INTERNAL track),
// customerStatus, salonId, distributorId (the admin/distributor view),
// searchString (order id).
const listForAdmin = async ({ page = 1, status, customerStatus, salonId, distributorId, buyerType, searchString = '' } = {}) => {
  const limit = DEFAULT_LIMIT;
  const safePage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
  const offset = (safePage - 1) * limit;

  const where = {};
  if (status && INTERNAL_STATUSES.includes(status)) where.status = status;
  if (customerStatus) where.customerStatus = customerStatus;
  if (salonId) where.salonId = salonId;
  if (distributorId) where.distributorId = distributorId;
  // 'SALON' | 'CUSTOMER' — the dashboard's Buyer type filter.
  const trimmedBuyerType = String(buyerType || '').trim().toUpperCase();
  if (['SALON', 'CUSTOMER'].includes(trimmedBuyerType)) where.buyerType = trimmedBuyerType;

  const trimmedSearch = String(searchString || '').trim();
  if (trimmedSearch) {
    // An order id, a salon name, or a customer's name / phone — the admin
    // should not have to know the id to find a customer's parcel.
    where[Op.or] = [
      { orderId: { [Op.iLike]: `%${trimmedSearch}%` } },
      { '$salon.salonName$': { [Op.iLike]: `%${trimmedSearch}%` } },
      { '$customer.fullName$': { [Op.iLike]: `%${trimmedSearch}%` } },
      { '$customer.phoneNumber$': { [Op.iLike]: `%${trimmedSearch}%` } }
    ];
  }

  const { count: totalOrders, rows: orders } = await db.ShopOrder.findAndCountAll({
    where,
    include: [
      { model: db.Salon, as: 'salon', attributes: ['salonId', 'salonName', 'phoneNumber', 'latitude', 'longitude', 'addressLine1', 'city'] },
      // Every customer order must arrive with its buyer: `salon` is null on
      // those rows, so this is the only name/phone the dashboard can show.
      { model: db.User, as: 'customer', attributes: ['userId', 'fullName', 'phoneNumber'] },
      {
        model: db.Distributor,
        as: 'distributor',
        attributes: ['distributorId', 'name', 'phone', 'area', 'deliveryCapability', 'latitude', 'longitude', 'locationUpdatedAt']
      },
      {
        model: db.ShopOrderEvent,
        as: 'events',
        separate: true,
        order: [['createdAt', 'ASC'], ['id', 'ASC']]
      }
    ],
    order: [['createdAt', 'DESC']],
    // The search above matches joined columns ($salon.… / $customer.…), which
    // Sequelize only exposes to the count query when the join is not wrapped
    // in a sub-query.
    subQuery: false,
    distinct: true,
    limit,
    offset
  });

  return {
    orders: orders.map(decorateForFulfilment),
    pagination: { page: safePage, limit, totalOrders, totalPages: Math.ceil(totalOrders / limit) || 0 }
  };
};

// Distributor portal: the orders currently on their plate. `status` filters
// the INTERNAL track (most useful: AWAITING_ACCEPTANCE = "respond to these").
const listForDistributor = async (distributorId, { page = 1, status } = {}) => {
  const limit = DEFAULT_LIMIT;
  const safePage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
  const offset = (safePage - 1) * limit;

  const where = { distributorId };
  if (status && INTERNAL_STATUSES.includes(status)) where.status = status;

  const { count: totalOrders, rows: orders } = await db.ShopOrder.findAndCountAll({
    where,
    include: [
      { model: db.Salon, as: 'salon', attributes: ['salonId', 'salonName', 'phoneNumber', 'latitude', 'longitude', 'addressLine1', 'city'] },
      // A customer parcel has no salon; the partner needs the buyer's name.
      { model: db.User, as: 'customer', attributes: ['userId', 'fullName', 'phoneNumber'] },
      {
        model: db.Distributor,
        as: 'distributor',
        attributes: ['distributorId', 'name', 'phone', 'area', 'latitude', 'longitude', 'locationUpdatedAt']
      },
      {
        model: db.ShopOrderEvent,
        as: 'events',
        separate: true,
        order: [['createdAt', 'ASC'], ['id', 'ASC']]
      }
    ],
    order: [['createdAt', 'DESC']],
    // The events include is `separate` (its own query), so counting rows here
    // does not need a sub-query — and skipping it keeps the joins count-safe.
    subQuery: false,
    distinct: true,
    limit,
    offset
  });

  return {
    orders: orders.map(decorateForFulfilment),
    pagination: { page: safePage, limit, totalOrders, totalPages: Math.ceil(totalOrders / limit) || 0 }
  };
};

/**
 * Admin: correct or add the delivery pin for an order (a salon with no
 * coordinates on file, or a delivery that goes somewhere else). Recorded in
 * the timeline with who moved it, because the pin decides the KM the next
 * assignment shows.
 */
const setDeliveryLocation = async (orderIdOrId, { latitude, longitude }, actor = {}) => {
  const order = await getById(orderIdOrId);
  if (!order) return null;
  if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
    throw new Error(`The delivery location is locked once an order is ${order.status}`);
  }
  const point = toPoint({ latitude, longitude });
  if (!point) throw new Error('A valid latitude and longitude pair is required');
  const previous = deliveryLocationOf(order);
  await order.update({ deliveryLatitude: point.latitude, deliveryLongitude: point.longitude });
  await logEvent(order, {
    actorType: actor.actorType || 'ADMIN',
    actorId: actor.actorId || null,
    actorLabel: actor.actorLabel || 'Admin',
    action: 'DELIVERY_LOCATION_SET',
    fromStatus: order.status,
    toStatus: order.status,
    note: `Delivery location set to ${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`
      + (previous.hasLocation ? ' (replacing the previous pin)' : '')
  });
  const fresh = await getById(orderIdOrId, { withEvents: true });
  return decorateForFulfilment(fresh);
};

module.exports = {
  DELIVERY_FEE,
  deliveryLocationOf,
  decorateForFulfilment,
  setDeliveryLocation,
  FREE_DELIVERY_ABOVE,
  computeTotals,
  INTERNAL_STATUSES,
  INTERNAL_TO_CUSTOMER_STATUS,
  createOrder,
  listForBuyer,
  listForSalon,
  getById,
  findByPaymentId,
  assignDistributor,
  acceptOrder,
  rejectOrder,
  distributorUpdateStatus,
  updateStatus,
  cancelByBuyer,
  cancelBySalon,
  listForAdmin,
  listForDistributor
};
