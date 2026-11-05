const shopCategoryService = require('../../services/shopCategory.service');

/**
 * Delete a category — refused while products use it.
 *
 * Body: `{ id, reassignTo? }`. With `reassignTo` the products are moved first
 * and then the row is deleted; without it, a category with products answers
 * `FAILED` naming the count, which is the panel's cue to offer
 * "Move 12 products to…".
 *
 * The refusal is a 200 with `status: 'FAILED'` — the same convention the rest of
 * this API uses for "the request was understood and declined", so the panel
 * reads `message` and shows it rather than parsing a status code.
 */
const adminDeleteShopCategory = async (request, response) => {
    try {
        const { id, reassignTo } = request.body || {};
        const result = await shopCategoryService.remove({ id, reassignTo });

        return response.status(200).json({
            status: 'SUCCESS',
            message: result.movedProducts
                ? `Category deleted, ${result.movedProducts} products moved`
                : 'Category deleted',
            data: result
        });
    } catch (error) {
        console.error('ADMIN DELETE SHOP CATEGORY ERROR:', error);
        // 404 = no such category; 400 = refused (in use, bad reassign target);
        // anything else is ours to fix and must not look like a declined action.
        const status = error.status === 404 ? 404 : error.status === 400 ? 200 : 500;
        return response.status(status).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = adminDeleteShopCategory;
