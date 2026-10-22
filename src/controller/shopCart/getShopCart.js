const shopCartService = require('../../services/shopCart.service');
const { resolveShopBuyer } = require('../../utils/shopBuyer');

// The buyer's cart, with live product fields and a server-computed bill.
// Web and app both render from this — same account, same cart, every device.
// The buyer (salon or customer) comes from the token, never the body.
const getShopCart = async (request, response) => {
    try {
        const buyer = resolveShopBuyer(request);
        if (!buyer) {
            return response.status(401).json({ status: 'JWT_FAILED', message: 'Sign in to view your cart' });
        }
        const data = await shopCartService.getCart(buyer);
        return response.status(200).json({ status: 'SUCCESS', message: 'Cart fetched successfully', data });
    } catch (error) {
        console.log('error', error);
        return response.status(500).json({ status: 'FAILED', message: error.message });
    }
};
module.exports = getShopCart;
