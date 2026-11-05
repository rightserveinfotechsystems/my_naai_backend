const shopCategoryService = require('../../services/shopCategory.service');

/**
 * Add a category to the one list.
 *
 * Body: `{ label, id?, sortOrder?, isActive? }`. The id is generated from the
 * label (`"Nail care"` -> `nail-care`) unless the caller pins it; the panel does
 * not pin it, and the response tells it what was generated so it can show the
 * id in the "this never changes" note.
 */
const adminCreateShopCategory = async (request, response) => {
    try {
        const { id, label, sortOrder, isActive } = request.body || {};
        const category = await shopCategoryService.create({ id, label, sortOrder, isActive });

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Category added successfully',
            data: { category }
        });
    } catch (error) {
        console.error('ADMIN CREATE SHOP CATEGORY ERROR:', error);
        return response.status(error.status || 500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = adminCreateShopCategory;
