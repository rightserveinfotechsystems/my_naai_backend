const { addShopCartSchema } = require('../../validations/shopCart.validation');
const shopCartService = require('../../services/shopCart.service');
const { resolveShopBuyer } = require('../../utils/shopBuyer');

// Add a shop product to the buyer's cart (top-up when already present).
// A salon and a customer each get their own cart from the same endpoint.
const addToShopCart = async (request, response) => {
    try {
        const buyer = resolveShopBuyer(request);
        if (!buyer) {
            return response.status(401).json({ status: 'JWT_FAILED', message: 'Sign in to add products to your cart' });
        }
        const { productId, qty } = request.body || {};
        const validationResult = addShopCartSchema.validate({ productId, qty }, { abortEarly: true });
        if (validationResult.error) {
            return response.status(400).json({ status: 'FAILED', message: validationResult.error.details[0].message });
        }

        const newQty = await shopCartService.addLine(buyer, validationResult.value.productId, validationResult.value.qty);
        if (newQty === null) {
            return response.status(404).json({ status: 'FAILED', message: 'Product not found or not available' });
        }

        const data = await shopCartService.getCart(buyer);
        return response.status(200).json({ status: 'SUCCESS', message: 'Item added to cart', data });
    } catch (error) {
        console.log('error', error);
        return response.status(500).json({ status: 'FAILED', message: error.message });
    }
};
module.exports = addToShopCart;
