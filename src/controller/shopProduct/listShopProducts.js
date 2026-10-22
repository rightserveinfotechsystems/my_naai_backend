const shopProductService = require('../../services/shopProduct.service');

// The buying side's catalog: the mobile app browses as a USER, the web shop
// as a SALON, and a visitor on the public website browses with no token at
// all. The catalog is company-wide and the payload carries only published
// fields, so no identity is required — the shop must open before sign-in.
const listShopProducts = async (request, respsone) => {
    try {
        // ONE controller for both doors (`/api/shop-products/list` with a
        // token and the token-free `/api/shop-public/products/list`), so the
        // website's browse and a signed-in browse send — and are answered with
        // — exactly the same query.
        const {
            page,
            pageSize,
            searchString,
            category,
            gender,
            priceRange,
            sort,
            inStock
        } = request.body || {};
        const data = await shopProductService.listCatalog({
            page,
            pageSize,
            searchString,
            category,
            gender,
            priceRange,
            sort,
            inStock
        });

        return respsone.status(200).json({
            status: 'SUCCESS',
            message: 'Shop product list fetched successfully',
            data
        });
    } catch (error) {
        return respsone.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};
module.exports = listShopProducts;
