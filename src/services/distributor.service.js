const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const db = require('../database/models');
const { toCoordinate, toPoint, distanceKm, sortByDistance } = require('../utils/geo');
const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;

/**
 * Distributor management (company admin) + portal login. A distributor is a
 * delivery partner the admin requests for shop orders; the distributor logs
 * in with the password the admin set and accepts or rejects their orders.
 * The `password` hash is never returned to any client.
 *
 * LOCATION — a distributor carries coordinates (set by the admin's pin while
 * adding them, refreshed by the portal's own GPS). Those coordinates are what
 * turn a flat list into a dispatch decision: `/list` accepts a reference point
 * (the order's delivery location) and answers nearest-first with `distanceKm`
 * per row, and an order payload carries `distributor.distanceKm`.
 */
const publicView = (distributor) => {
  if (!distributor) return null;
  const view = distributor.toJSON ? distributor.toJSON() : { ...distributor };
  delete view.password;
  // Coordinates are stored as numbers already; normalise anyway so a caller
  // never has to guess between a string and a number.
  view.latitude = toCoordinate(view.latitude);
  view.longitude = toCoordinate(view.longitude);
  view.hasLocation = Boolean(toPoint(view));
  return view;
};

const hashPassword = (plain) => (plain ? bcrypt.hashSync(plain, 10) : null);

// Only touch the location columns when the caller actually sent them: an
// unrelated edit (renaming a partner) must not wipe a pin the admin placed.
const locationPatch = (data = {}) => {
  const patch = {};
  const sentLat = Object.prototype.hasOwnProperty.call(data, 'latitude');
  const sentLng = Object.prototype.hasOwnProperty.call(data, 'longitude');
  if (!sentLat && !sentLng) return patch;
  const latitude = toCoordinate(data.latitude);
  const longitude = toCoordinate(data.longitude);
  patch.latitude = latitude;
  patch.longitude = longitude;
  patch.locationUpdatedAt = latitude !== null && longitude !== null ? new Date() : null;
  return patch;
};

/**
 * Admin list. Without a reference point this is the familiar alphabetical,
 * paginated list. WITH a reference point (`latitude` + `longitude`, i.e. the
 * order's delivery location) the whole filtered set is sorted nearest-first
 * and THEN paginated — sorting only the current page would put a "nearest"
 * distributor on page 3, which is exactly the bug this endpoint exists to
 * avoid. The partner table stays small, so this is a cheap sort.
 */
const list = async ({ page = 1, searchString = '', latitude, longitude, sortBy } = {}) => {
  const limit = DEFAULT_LIMIT;
  const safePage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;

  const where = {};
  const trimmedSearch = String(searchString || '').trim();
  if (trimmedSearch) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${trimmedSearch}%` } },
      { phone: { [Op.iLike]: `%${trimmedSearch}%` } },
      { area: { [Op.iLike]: `%${trimmedSearch}%` } }
    ];
  }

  const rows = await db.Distributor.findAll({
    where,
    order: [['name', 'ASC']]
  });

  const reference = toPoint({ latitude, longitude });
  const wantsDistance = Boolean(reference) && sortBy !== 'name';
  const decorated = rows.map((row) => {
    const view = publicView(row);
    view.distanceKm = reference ? distanceKm(view, reference) : null;
    return view;
  });

  const sorted = wantsDistance
    ? sortByDistance(decorated, reference)
    : decorated.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

  const totalDistributors = sorted.length;
  const offset = (safePage - 1) * limit;
  const pageRows = sorted.slice(offset, offset + limit);

  return {
    distributors: pageRows,
    pagination: { page: safePage, limit, totalDistributors, totalPages: Math.ceil(totalDistributors / limit) || 0 },
    // Echo what the ordering was based on, so the admin panel can label the
    // column honestly ("nearest to this order" vs "A–Z").
    reference: reference ? { ...reference, orderedBy: wantsDistance ? 'distance' : 'name' } : { orderedBy: 'name' }
  };
};

const getById = async (distributorId) => db.Distributor.findByPk(distributorId);

const create = async (dataToInsert) => {
  const data = { ...dataToInsert };
  if (data.password) data.password = hashPassword(data.password);
  Object.assign(data, locationPatch(data));
  const created = await db.Distributor.create(data);
  return publicView(created);
};

const update = async (distributorId, dataToUpdate) => {
  const distributor = await db.Distributor.findByPk(distributorId);
  if (!distributor) return null;
  const data = { ...dataToUpdate };
  if (data.password !== undefined) data.password = data.password ? hashPassword(data.password) : null;
  Object.assign(data, locationPatch(data));
  await distributor.update(data);
  return publicView(distributor);
};

/**
 * Distributor portal: refresh the live location. Called from the portal's
 * "Update my location" button with the browser's own GPS fix, and by the
 * admin while correcting a pin — both end up in the same columns so the KM
 * arithmetic never has two sources of truth.
 */
const updateLocation = async (distributorId, { latitude, longitude }) => {
  const distributor = await db.Distributor.findByPk(distributorId);
  if (!distributor) return null;
  const lat = toCoordinate(latitude);
  const lng = toCoordinate(longitude);
  if (lat === null || lng === null) return null;
  await distributor.update({ latitude: lat, longitude: lng, locationUpdatedAt: new Date() });
  return publicView(distributor);
};

// Portal login: phone or email + the password the admin set.
const login = async (identifier, password) => {
  const trimmed = String(identifier || '').trim();
  const distributor = await db.Distributor.findOne({
    where: {
      [Op.or]: [
        { phone: trimmed },
        { email: { [Op.iLike]: trimmed } }
      ],
      isActive: true
    }
  });
  if (!distributor || !distributor.password) return null;
  const ok = await bcrypt.compare(password, distributor.password);
  return ok ? publicView(distributor) : null;
};

module.exports = { list, getById, create, update, updateLocation, login, publicView };
