const { updateDistributorLocationSchema } = require('../../validations/distributor.validation');
const distributorService = require('../../services/distributor.service');

/**
 * Live location ping.
 *
 * Two callers, one contract:
 *   · the distributor portal — its own token, its own row ("where I am now",
 *     read from the browser's GPS when the distributor taps Update location);
 *   · the admin panel — the admin token plus the `distributorId` being
 *     corrected (the same field the rest of the Distributors tab uses).
 *
 * A stale pin is worse than no pin, so the refresh timestamp goes back with
 * every response and the clients show it.
 */
const updateDistributorLocation = async (request, response) => {
    try {
        const own = request.distributor;
        const { distributorId, latitude, longitude } = request.body || {};
        const targetId = own?.distributorId || distributorId;
        if (!targetId) {
            return response.status(400).json({ status: 'FAILED', message: 'Distributor Id is required' });
        }
        const validationResult = updateDistributorLocationSchema.validate({ latitude, longitude }, { abortEarly: true });
        if (validationResult.error) {
            return response.status(400).json({ status: 'FAILED', message: validationResult.error.details[0].message });
        }
        const result = await distributorService.updateLocation(targetId, validationResult.value);
        if (!result) {
            return response.status(404).json({ status: 'FAILED', message: 'Distributor not found' });
        }
        return response.status(200).json({ status: 'SUCCESS', message: 'Distributor location updated', data: result });
    } catch (error) {
        console.log('error', error);
        return response.status(500).json({ status: 'FAILED', message: error.message });
    }
};
module.exports = updateDistributorLocation;
