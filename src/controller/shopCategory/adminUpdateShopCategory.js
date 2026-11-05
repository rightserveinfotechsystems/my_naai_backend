const shopCategoryService = require('../../services/shopCategory.service');

/**
 * Rename, re-order or hide a category.
 *
 * Body: `{ id, label?, sortOrder?, isActive? }`. `id` identifies the row and can
 * never be changed — products store it, so re-slugging a category would orphan
 * every product filed under it. The panel says so next to the field; this
 * endpoint is where that promise is kept.
 */
const adminUpdateShopCategory = async (request, response) => {
    try {
        const { id, label, sortOrder, isActive } = request.body || {};
        const category = await shopCategoryService.update({ id, label, sortOrder, isActive });

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Category updated successfully',
            data: { category }
        });
    } catch (error) {
        console.error('ADMIN UPDATE SHOP CATEGORY ERROR:', error);
        return response.status(error.status || 500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = adminUpdateShopCategory;
