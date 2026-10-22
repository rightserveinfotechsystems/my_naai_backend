// utils/shopBuyer.js
//
// Who is using the shop right now — the one place that answers it.
//
// The shop serves two kinds of buyer through the same endpoints:
//
//   SALON     a partner buying stock for its chairs (the original B2B shop)
//   CUSTOMER  a user of the mobile app / website buying grooming products
//
// Both authenticate with a bearer token. `authenticateSalon` attaches the
// Salon row (`request.salon`), `authUserOrSalon` attaches either that or
// `request.user`, which is `{ id, phoneNumber }` for a customer. The buyer is
// read from THOSE — never from the request body, which a client could set to
// somebody else's id and then read or cancel their orders.
const SALON_ROLES = ['SALON', 'PARTNER'];
const CUSTOMER_ROLES = ['USER', 'CUSTOMER', 'CLIENT'];

/**
 * @returns {{ buyerType: 'SALON'|'CUSTOMER', buyerId: string, isSalon: boolean } | null}
 *          null when the token carries no usable identity → the controller
 *          answers 401.
 */
const resolveShopBuyer = (request) => {
    if (!request) return null;

    const salon = request.salon;
    const salonId = salon && (salon.salonId || salon.salon_id || salon.id);
    if (salonId) {
        return { buyerType: 'SALON', buyerId: String(salonId), isSalon: true };
    }

    const user = request.user;
    const userId = user && (user.id || user.userId || user.user_id);
    const role = String((user && (user.role || user.userType)) || '').toUpperCase();
    // `request.user` from authUserOrSalon carries no role: its mere presence
    // (there is no request.salon) means the token was a customer token.
    if (userId && (!role || CUSTOMER_ROLES.includes(role))) {
        return { buyerType: 'CUSTOMER', buyerId: String(userId), isSalon: false };
    }

    // Any other middleware that attaches a bare `{ role, id }`.
    const bareId = request.auth && (request.auth.id || request.auth.userId);
    if (bareId) {
        const bareRole = String(request.auth.role || request.auth.userType || '').toUpperCase();
        if (SALON_ROLES.includes(bareRole)) return { buyerType: 'SALON', buyerId: String(bareId), isSalon: true };
        if (CUSTOMER_ROLES.includes(bareRole)) return { buyerType: 'CUSTOMER', buyerId: String(bareId), isSalon: false };
    }

    return null;
};

/**
 * The Sequelize `where` fragment for a buyer: the single place that knows
 * which column identifies them, so a service never branches on the role.
 */
const buyerWhere = (buyer) => (
    buyer && buyer.buyerType === 'CUSTOMER'
        ? { customerId: buyer.buyerId }
        : { salonId: buyer ? buyer.buyerId : null }
);

/**
 * The columns written when a buyer places something. Exactly one of the two
 * ids is set — a row belongs to a salon or to a customer, never both.
 */
const buyerColumns = (buyer) => (
    buyer && buyer.buyerType === 'CUSTOMER'
        ? { buyerType: 'CUSTOMER', customerId: buyer.buyerId, salonId: null }
        : { buyerType: 'SALON', salonId: buyer ? buyer.buyerId : null, customerId: null }
);

/**
 * True when this buyer owns this order. Used by get-by-id and cancel so one
 * buyer can never read or cancel another's parcel.
 */
const buyerOwnsOrder = (buyer, order) => {
    if (!buyer || !order) return false;
    const row = order.toJSON ? order.toJSON() : order;
    return buyer.buyerType === 'CUSTOMER'
        ? String(row.customerId || '') === buyer.buyerId
        : String(row.salonId || '') === buyer.buyerId;
};

/**
 * The actor written into `shop_order_events` when a buyer moves their own
 * order (placement, cancellation). The admin timeline renders the same row
 * shape for both buyers.
 */
const buyerActor = (buyer, label) => ({
    actorType: buyer && buyer.buyerType === 'CUSTOMER' ? 'CUSTOMER' : 'SALON',
    actorId: buyer ? buyer.buyerId : null,
    actorLabel: label || (buyer && buyer.buyerType === 'CUSTOMER' ? 'Customer' : 'Salon')
});

module.exports = { resolveShopBuyer, buyerWhere, buyerColumns, buyerOwnsOrder, buyerActor };
