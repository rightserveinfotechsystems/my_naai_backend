const shopCategoryService = require('../../services/shopCategory.service');

/**
 * The storefront's category list.
 *
 * ONE handler answers three doors — `POST /api/shop-categories/list` (a signed-in
 * customer or salon), `POST /api/shop-public/categories/list` and its GET twin
 * (no token at all) — so the website, the app and the panel cannot be served
 * different lists.
 *
 * Only ACTIVE categories are returned, in the admin's order. `data.categories`
 * is the shape the website reads; the extra `count` lets a client that shows a
 * number beside a chip do it without a second call.
 */
const listShopCategories = async (request, response) => {
    try {
        const categories = await shopCategoryService.listActive();

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Shop categories fetched successfully',
            data: {
                categories,
                count: categories.length
            }
        });
    } catch (error) {
        console.error('LIST SHOP CATEGORIES ERROR:', error);
        return response.status(error.status || 500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = listShopCategories;
