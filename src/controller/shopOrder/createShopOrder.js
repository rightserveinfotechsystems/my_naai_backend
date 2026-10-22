const { createShopOrderSchema } = require('../../validations/shopOrder.validation');
const shopOrderService = require('../../services/shopOrder.service');
const { resolveShopBuyer } = require('../../utils/shopBuyer');

// One endpoint, two buyers: a SALON restocking its chairs and a CUSTOMER
// buying for home. The buyer comes from the TOKEN (resolveShopBuyer) — the
// body never names a salon or a customer, so a client cannot place an order
// into somebody else's history. The client sends the exact snapshot shape it
// keeps locally; the bill is recomputed here so the amounts can never be
// tampered with. The client's order id is honoured so the web's local record
// and this record share an id (same for the app).
const createShopOrder = async (request, response) => {
    try {
        const buyer = resolveShopBuyer(request);
        if (!buyer) {
            return response.status(401).json({
                status: 'JWT_FAILED',
                message: 'Sign in to place this order'
            });
        }

        const { orderId, items, address, payment, notes } = request.body || {};

        const validationResult = createShopOrderSchema.validate(
            { orderId, items, address, payment, notes },
            { abortEarly: false }
        );

        if (validationResult.error) {
            const first = validationResult.error.details[0];
            return response.status(400).json({
                status: 'FAILED',
                message: first?.message || 'Invalid order'
            });
        }

        const value = validationResult.value;
        const order = await shopOrderService.createOrder({
            ...buyer,                       // buyerType, buyerId, isSalon
            orderId: value.orderId || null,
            items: value.items,
            address: value.address,
            payment: value.payment,
            notes: value.notes
        });

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Order placed successfully',
            data: order
        });
    } catch (error) {
        console.log('error', error);
        if (String(error?.name) === 'SequelizeUniqueConstraintError') {
            return response.status(409).json({ status: 'FAILED', message: 'Order id already registered — refresh your order list' });
        }
        // The COD limit is a business rule (client-side error), not a crash.
        if (/Cash on delivery is available only/i.test(error.message)) {
            return response.status(400).json({ status: 'FAILED', message: error.message });
        }
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = createShopOrder;
