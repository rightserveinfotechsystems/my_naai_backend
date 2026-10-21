const shopOrderService = require('../../services/shopOrder.service');

// The salon's own order history. The SALON track is what it may see: the
// response's `status` is the customer status, and the internal fulfilment
// state plus the assigned distributor are stripped.
//
// `deliveryLocation` stays: it is the salon's OWN address (the point the
// admin and the distributor see on their map), so the salon can confirm the
// pin is right. The partner's identity and how far away they are remain
// internal.
const cleanForSalon = (order) => {
    const clean = order.toJSON();
    clean.status = order.customerStatus;
    clean.deliveryLocation = shopOrderService.deliveryLocationOf(clean);
    delete clean.customerStatus;
    delete clean.distributorId;
    delete clean.distributor;
    // The raw snapshot columns are already summarised by deliveryLocation.
    delete clean.deliveryLatitude;
    delete clean.deliveryLongitude;
    return clean;
};

const listShopOrders = async (request, response) => {
    try {
        const salonId = request.salon?.salonId;
        if (!salonId) {
            return response.status(400).json({ status: 'FAILED', message: 'Salon Id not found in token' });
        }

        const { page } = request.body || {};
        const { orders, pagination } = await shopOrderService.listForSalon(salonId, page);

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Order list fetched successfully',
            data: { orders: orders.map(cleanForSalon), pagination }
        });
    } catch (error) {
        console.log('error', error);
        return response.status(500).json({ status: 'FAILED', message: error.message });
    }
};

module.exports = listShopOrders;
module.exports.cleanForSalon = cleanForSalon;
