/**
 * Geo helpers — delivery distances on the planet we actually deliver on.
 *
 * A distributor and a salon (the delivery point) are two points on a sphere;
 * the "KM" the admin sees is the great-circle (haversine) distance between
 * them, NOT a straight line on a projected map and NOT a driving route. That
 * is deliberate: it is instant, needs no routing provider, works offline and
 * never disagrees with itself between the admin panel, the distributor portal
 * and a re-sorted list. A road distance can be added later without changing
 * this contract — `distanceKm` is already the field every client reads.
 *
 * Coordinates are stored as DOUBLE columns but arrive from a browser
 * (`navigator.geolocation`) or from a client payload where they may be
 * strings, `''`, `null` or `undefined`. Every entry point normalises through
 * `toCoordinate`, so 0 is a real coordinate (the equator / Greenwich) while
 * an absent value is `null` — never NaN and never a silent 0.
 */
const EARTH_RADIUS_KM = 6371;

const toCoordinate = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const isValidLatitude = (value) => {
  const n = toCoordinate(value);
  return n !== null && n >= -90 && n <= 90;
};

const isValidLongitude = (value) => {
  const n = toCoordinate(value);
  return n !== null && n >= -180 && n <= 180;
};

// A usable point needs BOTH halves; half a coordinate is not a location, it is
// a data-entry bug that must never be rendered as one.
const toPoint = (source) => {
  if (!source) return null;
  const latitude = toCoordinate(source.latitude);
  const longitude = toCoordinate(source.longitude);
  if (latitude === null || longitude === null) return null;
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return null;
  return { latitude, longitude };
};

const haversineKm = (fromLat, fromLon, toLat, toLon) => {
  const lat1 = Number(fromLat);
  const lon1 = Number(fromLon);
  const lat2 = Number(toLat);
  const lon2 = Number(toLon);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a))));
};

// Two decimals is ~10 m — precise enough to sort and to warn a dispatcher,
// and coarse enough that a stored value never reads like a GPS track.
const roundKm = (km, digits = 2) => {
  if (!Number.isFinite(km)) return null;
  const factor = 10 ** digits;
  return Math.round(km * factor) / factor;
};

// Distance between two point-like objects ({latitude, longitude}) or between a
// point and a stored row. Returns null when either end has no usable location.
const distanceKm = (from, to) => {
  const a = toPoint(from);
  const b = toPoint(to);
  if (!a || !b) return null;
  return roundKm(haversineKm(a.latitude, a.longitude, b.latitude, b.longitude));
};

// Decorate a row (a Sequelize instance or a plain object) with the distance to
// `reference`, keeping everything else untouched.
const withDistance = (row, reference) => {
  if (!row) return null;
  const plain = row.toJSON ? row.toJSON() : { ...row };
  const distance = distanceKm(plain, reference);
  return { ...plain, distanceKm: distance };
};

// Nearest first. Rows with no known location go last (they are not "far", they
// are simply unknown — putting them at km 0 would push them to the top of a
// dispatch list, which is the one thing a nearest-first list must not do),
// then ties break by name so paging is stable.
const sortByDistance = (rows = [], reference = null) => {
  const list = [...rows];
  const hasReference = Boolean(toPoint(reference));
  if (!hasReference) {
    return list.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }
  return list.sort((a, b) => {
    const aKm = distanceKm(a, reference);
    const bKm = distanceKm(b, reference);
    if (aKm === null && bKm === null) return String(a?.name || '').localeCompare(String(b?.name || ''));
    if (aKm === null) return 1;
    if (bKm === null) return -1;
    if (aKm !== bKm) return aKm - bKm;
    return String(a?.name || '').localeCompare(String(b?.name || ''));
  });
};

// Human label used in order events and API messages ("4.2 km").
const formatKm = (km) => (Number.isFinite(km) ? `${Number(km).toFixed(1)} km` : null);

// A free, key-less deep link that opens the point in whatever map app the
// phone has. Shared by the admin panel and the distributor portal.
const mapsUrl = (source) => {
  const point = toPoint(source);
  if (!point) return null;
  return `https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`;
};

module.exports = {
  EARTH_RADIUS_KM,
  toCoordinate,
  isValidLatitude,
  isValidLongitude,
  toPoint,
  haversineKm,
  roundKm,
  distanceKm,
  withDistance,
  sortByDistance,
  formatKm,
  mapsUrl
};
