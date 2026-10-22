const { getShopOrderSchema } = require('../../validations/shopOrder.validation');
const shopOrderService = require('../../services/shopOrder.service');
const { resolveShopBuyer } = require('../../utils/shopBuyer');
const { cleanForSalon } = require('./listShopOrders');

// The buyer's own order detail — same salon-track view as the list. The
// ownership check runs inside the service, so an order that belongs to
// somebody else answers exactly like a missing id.
const getShopOrderById = async (request, response) => {
    try {
        const buyer = resolveShopBuyer(request);
        if (!buyer) {
            return response.status(401).json({ status: 'JWT_FAILED', message: 'Sign in to view this order' });
        }

        const { orderId } = request.body || {};
        const validationResult = getShopOrderSchema.validate({ orderId }, { abortEarly: true });
        if (validationResult.error) {
            return response.status(400).json({ status: 'FAILED', message: validationResult.error.details[0].message });
        }

        const order = await shopOrderService.getById(orderId, { buyer });
        if (!order) {
            return response.status(404).json({ status: 'FAILED', message: 'Order not found' });
        }

        return response.status(200).json({ status: 'SUCCESS', message: 'Order fetched successfully', data: cleanForSalon(order) });
    } catch (error) {
        console.log('error', error);
        return response.status(500).json({ status: 'FAILED', message: error.message });
    }
};

module.exports = getShopOrderById;
