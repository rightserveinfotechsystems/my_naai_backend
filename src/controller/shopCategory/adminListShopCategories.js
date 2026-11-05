const shopCategoryService = require('../../services/shopCategory.service');

/**
 * The admin panel's Categories manager.
 *
 * Every category, including the hidden ones (the panel has to be able to un-hide
 * a row, so hiding must not make it unreadable), each with `productCount`, plus
 * `unmatched`: the free-text values that no category owns. Those are the rows an
 * admin has to re-file, and showing them is what stops "twelve products on a
 * shelf nobody can see".
 *
 * Body: `{ includeInactive: true }` (default true).
 */
const adminListShopCategories = async (request, response) => {
    try {
        const { includeInactive = true } = request.body || {};
        const data = await shopCategoryService.listAdmin({ includeInactive });

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Shop categories fetched successfully',
            data: {
                ...data,
                count: data.categories.length
            }
        });
    } catch (error) {
        console.error('ADMIN LIST SHOP CATEGORIES ERROR:', error);
        return response.status(error.status || 500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = adminListShopCategories;
