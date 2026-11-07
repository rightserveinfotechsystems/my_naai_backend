const shopProductService = require('../../services/shopProduct.service');

/**
 * Company admin: the full shop catalog (soft-deleted rows excluded).
 *
 * Body: `{ page, pageSize?, searchString?, category?, gender?, sort?, inStock? }`
 *
 * The facets are the SHOP's own — the same ones the storefront sends, resolved
 * by the same code (`shopProduct.service.listCatalog`), including the live
 * category list. That is what lets the panel answer "does the shop show the
 * products I filed under this category?" with the shop's answer rather than with
 * a second opinion: filtering here and filtering on the website return the same
 * rows for the same category.
 */
const adminListShopProducts = async (request, response) => {
    try {
        const { page, pageSize, searchString, category, gender, sort, inStock } = request.body || {};
        const data = await shopProductService.listCatalog({
            page,
            pageSize,
            searchString,
            category,
            gender,
            sort,
            inStock
        });
        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Shop product list fetched successfully',
            data
        });
    } catch (error) {
        console.log('error', error);
        return response.status(500).json({ status: 'FAILED', message: error.message });
    }
};
module.exports = adminListShopProducts;
