const { adminCreateShopProductSchema } = require('../../validations/shopProduct.validation');
const shopProductService = require('../../services/shopProduct.service');
const shopCategoryService = require('../../services/shopCategory.service');
const categoryRules = require('../../services/shopCategoryRules');

// Company admin: add a product to the company's own shop catalog. No salon
// is involved — this table is separate from the salons' customer products.
const adminCreateShopProduct = async (request, response) => {
    try {
        const { productImage, productName, price, rating, isAvailable, mrp, category, gender, description } = request.body || {};

        const validationResult = adminCreateShopProductSchema.validate(
            { productImage, productName, price, rating, isAvailable, mrp, category, gender, description },
            { abortEarly: true }
        );
        if (validationResult.error) {
            return response.status(400).json({ status: 'FAILED', message: validationResult.error.details[0].message });
        }

        const value = validationResult.value;
        // A product may only be filed under a category from the shared list —
        // free text is what let "Hair Colour and Chemical Products" put a bottle
        // of hair oil under HAIR COLOUR on the website. An empty value is still
        // allowed: the shop then falls back to its name-based inference.
        const categoryId = await shopCategoryService.requireCategoryId(value.category, { allowEmpty: true });

        const dataToInsert = {
            productName: value.productName,
            price: value.price,
            rating: value.rating,
            isAvailable: value.isAvailable,
            productImage: value.productImage || null,
            mrp: value.mrp ?? null,
            // Empty is still allowed, but it is no longer LEFT empty: the same
            // keyword rules the storefront uses fill in the shelf the name proves
            // the product belongs to. That keeps the column equal to the filter
            // (see services/shopCategoryRules.js) instead of drifting apart.
            category: categoryId || categoryRules.inferCategory(value.productName),
            // NULL keeps the shop UI's name-based gender fallback alive.
            gender: value.gender || null,
            description: value.description || null
        };

        const result = await shopProductService.create(dataToInsert);

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Shop product added successfully',
            data: {
                productId: result?.productId,
                productName: result?.productName,
                price: result?.price,
                mrp: result?.mrp,
                category: result?.category,
                gender: result?.gender,
                description: result?.description,
                rating: result?.rating,
                isAvailable: result?.isAvailable,
                stockStatus: result?.stockStatus,
                productImage: result?.productImage
            }
        });
    } catch (error) {
        console.log('error', error);
        return response.status(error.status || 500).json({ status: 'FAILED', message: error.message });
    }
};
module.exports = adminCreateShopProduct;
