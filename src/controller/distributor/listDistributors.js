const { listDistributorSchema } = require('../../validations/distributor.validation');
const distributorService = require('../../services/distributor.service');

// Company admin: the delivery partners orders can be assigned to.
//
// Send `latitude` + `longitude` (the order's delivery location) to get a
// dispatch-ready list: every row carries `distanceKm`, rows are sorted
// nearest-first (partners with no pin land last), and `data.reference` says
// which ordering was applied. Without a reference point the list stays
// alphabetical so the Distributors tab keeps its familiar order.
const listDistributors = async (request, response) => {
    try {
        const { page, searchString, latitude, longitude, sortBy } = request.body || {};
        const validationResult = listDistributorSchema.validate({ page, searchString, latitude, longitude, sortBy }, { abortEarly: true });
        if (validationResult.error) {
            return response.status(400).json({ status: 'FAILED', message: validationResult.error.details[0].message });
        }
        const value = validationResult.value;
        const data = await distributorService.list({
            page: value.page,
            searchString: value.searchString,
            latitude: value.latitude === '' ? null : value.latitude,
            longitude: value.longitude === '' ? null : value.longitude,
            sortBy: value.sortBy
        });
        return response.status(200).json({ status: 'SUCCESS', message: 'Distributor list fetched successfully', data });
    } catch (error) {
        console.log('error', error);
        return response.status(500).json({ status: 'FAILED', message: error.message });
    }
};
module.exports = listDistributors;
