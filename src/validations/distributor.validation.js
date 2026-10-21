const Joi = require('joi');

// Coordinates arrive from a browser GPS fix or from a map picker. `null` and
// `''` both mean "no pin yet" (the admin can save a partner before visiting the
// site), so they are allowed — but a half coordinate is not a location, so the
// pair is validated together by `withLocationPair` below.
const latitude = Joi.number().min(-90).max(90).optional().allow(null, '');
const longitude = Joi.number().min(-180).max(180).optional().allow(null, '');

// Two rules that a per-field schema cannot express:
//   1. a latitude without a longitude (or the reverse) is not a location;
//   2. NaN / an out-of-range value must never reach the DB as a coordinate.
const withLocationPair = (schema) => schema.custom((value, helpers) => {
  const hasLat = value.latitude !== undefined && value.latitude !== null && value.latitude !== '';
  const hasLng = value.longitude !== undefined && value.longitude !== null && value.longitude !== '';
  if (hasLat !== hasLng) {
    return helpers.error('any.invalid', { message: 'latitude and longitude must be sent together' });
  }
  return value;
}, 'latitude/longitude pair');

const createDistributorSchema = withLocationPair(Joi.object({
  name: Joi.string().required(),
  phone: Joi.string().optional().allow(null, ''),
  email: Joi.string().email().optional().allow(null, ''),
  area: Joi.string().max(200).optional().allow(null, ''),
  deliveryCapability: Joi.string().max(200).optional().allow(null, ''),
  address: Joi.string().max(2000).optional().allow(null),
  // Portal login password (plain text in the payload, stored hashed).
  password: Joi.string().min(6).max(100).optional().allow(null, ''),
  isActive: Joi.boolean().optional().default(true),
  // Dispatch location — the admin drops a pin (map click or "use current
  // location") while adding the partner; used for the KM / nearest-first sort.
  latitude,
  longitude
}));

const updateDistributorSchema = withLocationPair(Joi.object({
  distributorId: Joi.string().uuid().required(),
  name: Joi.string().optional(),
  phone: Joi.string().optional().allow(null, ''),
  email: Joi.string().email().optional().allow(null, ''),
  area: Joi.string().max(200).optional().allow(null, ''),
  deliveryCapability: Joi.string().max(200).optional().allow(null, ''),
  address: Joi.string().max(2000).optional().allow(null),
  // Empty string clears the password (disables portal login).
  password: Joi.string().min(6).max(100).optional().allow(null, ''),
  isActive: Joi.boolean().optional(),
  // Send the pair to move the pin, or send both as null to clear it.
  latitude,
  longitude
}));

// Distributor portal: refresh the live location. Only the pair, nothing else.
const updateDistributorLocationSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required()
});

// Admin list options. Sending a reference point turns the response into a
// nearest-first list (`distanceKm` per row); without one it stays alphabetical.
const listDistributorSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  searchString: Joi.string().allow('', null).optional(),
  latitude: Joi.number().min(-90).max(90).optional().allow(null, ''),
  longitude: Joi.number().min(-180).max(180).optional().allow(null, ''),
  sortBy: Joi.string().valid('name', 'distance').optional()
}).custom((value, helpers) => {
  const hasLat = value.latitude !== undefined && value.latitude !== null && value.latitude !== '';
  const hasLng = value.longitude !== undefined && value.longitude !== null && value.longitude !== '';
  if (hasLat !== hasLng) return helpers.error('any.invalid', { message: 'latitude and longitude must be sent together' });
  return value;
}, 'reference point pair');

// Distributor portal login — identifier is the phone OR the email on file.
const loginDistributorSchema = Joi.object({
  identifier: Joi.string().required(),
  password: Joi.string().required()
});

module.exports = {
  createDistributorSchema,
  updateDistributorSchema,
  updateDistributorLocationSchema,
  listDistributorSchema,
  loginDistributorSchema
};
