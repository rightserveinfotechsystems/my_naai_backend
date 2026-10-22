const { removeShopCartSchema } = require('../../validations/shopCart.validation');
const shopCartService = require('../../services/shopCart.service');
const { resolveShopBuyer } = require('../../utils/shopBuyer');

// Remove one line from the buyer's cart.
const removeFromShopCart = async (request, response) => {
    try {
        const buyer = resolveShopBuyer(request);
        if (!buyer) {
            return response.status(401).json({ status: 'JWT_FAILED', message: 'Sign in to change your cart' });
        }
        const { productId } = request.body || {};
        const validationResult = removeShopCartSchema.validate({ productId }, { abortEarly: true });
        if (validationResult.error) {
            return response.status(400).json({ status: 'FAILED', message: validationResult.error.details[0].message });
        }

        const removed = await shopCartService.removeLine(buyer, validationResult.value.productId);
        if (!removed) {
            return response.status(404).json({ status: 'FAILED', message: 'Item not in cart' });
        }

        const data = await shopCartService.getCart(buyer);
        return response.status(200).json({ status: 'SUCCESS', message: 'Item removed from cart', data });
    } catch (error) {
        console.log('error', error);
        return response.status(500).json({ status: 'FAILED', message: error.message });
    }
};
module.exports = removeFromShopCart;
