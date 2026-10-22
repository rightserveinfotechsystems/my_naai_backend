const shopCartService = require('../../services/shopCart.service');
const { resolveShopBuyer } = require('../../utils/shopBuyer');

// Empty the buyer's cart (called after a successful order placement).
const clearShopCart = async (request, response) => {
    try {
        const buyer = resolveShopBuyer(request);
        if (!buyer) {
            return response.status(401).json({ status: 'JWT_FAILED', message: 'Sign in to change your cart' });
        }
        await shopCartService.clearCart(buyer);
        return response.status(200).json({ status: 'SUCCESS', message: 'Cart cleared' });
    } catch (error) {
        console.log('error', error);
        return response.status(500).json({ status: 'FAILED', message: error.message });
    }
};
module.exports = clearShopCart;
