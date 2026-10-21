const { adminSetDeliveryLocationSchema } = require('../../validations/shopOrder.validation');
const shopOrderService = require('../../services/shopOrder.service');

/**
 * Company admin: place (or correct) the delivery pin for an order.
 *
 * Why this exists — a salon created before coordinates were compulsory has
 * none on file, so its order has no map and no KM. Rather than blocking
 * dispatch, the admin can drop the pin from the order itself; the change lands
 * in the order's timeline and immediately drives the "nearest distributor"
 * ordering in the assign screen.
 */
const adminSetDeliveryLocation = async (request, response) => {
    try {
        const { orderId, latitude, longitude } = request.body || {};
        const validationResult = adminSetDeliveryLocationSchema.validate({ orderId, latitude, longitude }, { abortEarly: true });
        if (validationResult.error) {
            return response.status(400).json({ status: 'FAILED', message: validationResult.error.details[0].message });
        }

        const actor = {
            actorType: 'ADMIN',
            actorId: request.admin?.adminId || request.admin?.id,
            actorLabel: request.admin?.name || 'Admin'
        };
        const updated = await shopOrderService.setDeliveryLocation(orderId, { latitude, longitude }, actor);
        if (!updated) {
            return response.status(404).json({ status: 'FAILED', message: 'Order not found' });
        }
        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Delivery location saved',
            data: updated
        });
    } catch (error) {
        console.log('error', error);
        const known = /locked once an order|valid latitude/.test(error.message);
        return response.status(known ? 400 : 500).json({ status: 'FAILED', message: error.message });
    }
};

module.exports = adminSetDeliveryLocation;
