const { createDistributorSchema } = require('../../validations/distributor.validation');
const distributorService = require('../../services/distributor.service');

// Company admin: add a delivery partner. The optional `latitude`/`longitude`
// pair is the dispatch pin the admin drops on the map (or sends from their own
// GPS) — it powers the KM column and the nearest-first list.
const createDistributor = async (request, response) => {
    try {
        const { name, phone, email, area, deliveryCapability, address, password, isActive, latitude, longitude } = request.body || {};
        const validationResult = createDistributorSchema.validate({ name, phone, email, area, deliveryCapability, address, password, isActive, latitude, longitude }, { abortEarly: true });
        if (validationResult.error) {
            return response.status(400).json({ status: 'FAILED', message: validationResult.error.details[0].message });
        }
        const value = validationResult.value;
        const result = await distributorService.create({
            name: value.name,
            phone: value.phone || null,
            email: value.email || null,
            area: value.area || null,
            deliveryCapability: value.deliveryCapability || null,
            address: value.address || null,
            password: value.password || null,
            isActive: value.isActive,
            // Only present when the admin placed a pin; absent leaves the
            // columns NULL, which the clients render as "no location yet".
            ...(value.latitude !== undefined || value.longitude !== undefined
                ? { latitude: value.latitude, longitude: value.longitude }
                : {})
        });
        return response.status(200).json({ status: 'SUCCESS', message: 'Distributor added successfully', data: result });
    } catch (error) {
        console.log('error', error);
        return response.status(500).json({ status: 'FAILED', message: error.message });
    }
};
module.exports = createDistributor;
