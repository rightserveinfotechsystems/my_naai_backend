const { cancelShopOrderSchema } = require('../../validations/shopOrder.validation');
const shopOrderService = require('../../services/shopOrder.service');
const { resolveShopBuyer } = require('../../utils/shopBuyer');
const { cleanForSalon } = require('./listShopOrders');

// Buyer self-service cancellation — free until the parcel leaves the depot.
// A paid online order is flagged for a refund. The buyer is whoever the token
// says, and the service only cancels an order that buyer owns.
const cancelShopOrder = async (request, response) => {
    try {
        const buyer = resolveShopBuyer(request);
        if (!buyer) {
            return response.status(401).json({ status: 'JWT_FAILED', message: 'Sign in to cancel this order' });
        }

        const { orderId, reason } = request.body || {};
        const validationResult = cancelShopOrderSchema.validate({ orderId, reason }, { abortEarly: true });
        if (validationResult.error) {
            return response.status(400).json({ status: 'FAILED', message: validationResult.error.details[0].message });
        }

        const updated = await shopOrderService.cancelByBuyer(orderId, { buyer, reason });
        if (!updated) {
            return response.status(404).json({ status: 'FAILED', message: 'Order not found' });
        }
        return response.status(200).json({ status: 'SUCCESS', message: 'Order cancelled successfully', data: cleanForSalon(updated) });
    } catch (error) {
        console.log('error', error);
        const known = /already cancelled|can no longer be cancelled/.test(error.message);
        return response.status(known ? 400 : 500).json({ status: 'FAILED', message: error.message });
    }
};

module.exports = cancelShopOrder;
