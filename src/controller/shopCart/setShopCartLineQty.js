const { setShopCartQtySchema } = require('../../validations/shopCart.validation');
const shopCartService = require('../../services/shopCart.service');
const { resolveShopBuyer } = require('../../utils/shopBuyer');

// Absolute quantity for a cart line (the stepper). qty 0 removes it.
const setShopCartLineQty = async (request, response) => {
    try {
        const buyer = resolveShopBuyer(request);
        if (!buyer) {
            return response.status(401).json({ status: 'JWT_FAILED', message: 'Sign in to change your cart' });
        }
        const { productId, qty } = request.body || {};
        const validationResult = setShopCartQtySchema.validate({ productId, qty }, { abortEarly: true });
        if (validationResult.error) {
            return response.status(400).json({ status: 'FAILED', message: validationResult.error.details[0].message });
        }

        const newQty = await shopCartService.setLineQty(buyer, validationResult.value.productId, validationResult.value.qty);
        if (newQty === null) {
            return response.status(404).json({ status: 'FAILED', message: 'Item not in cart' });
        }

        const data = await shopCartService.getCart(buyer);
        return response.status(200).json({ status: 'SUCCESS', message: 'Cart updated', data });
    } catch (error) {
        console.log('error', error);
        return response.status(500).json({ status: 'FAILED', message: error.message });
    }
};
module.exports = setShopCartLineQty;
