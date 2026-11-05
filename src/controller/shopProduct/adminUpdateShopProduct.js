const { adminUpdateShopProductSchema } = require('../../validations/shopProduct.validation');
const shopProductService = require('../../services/shopProduct.service');
const shopCategoryService = require('../../services/shopCategory.service');
const categoryRules = require('../../services/shopCategoryRules');

// Company admin: partially update a shop product. Unsent fields are left
// as-is.
const adminUpdateShopProduct = async (request, response) => {
    try {
        const { productId, productImage, productName, price, rating, isAvailable, mrp, category, gender, description } = request.body || {};

        const validationResult = adminUpdateShopProductSchema.validate(
            { productId, productImage, productName, price, rating, isAvailable, mrp, category, gender, description },
            { abortEarly: true }
        );
        if (validationResult.error) {
            return response.status(400).json({ status: 'FAILED', message: validationResult.error.details[0].message });
        }

        const dataToUpdate = {};
        if (productImage !== undefined) dataToUpdate.productImage = productImage || null;
        if (productName !== undefined) dataToUpdate.productName = productName;
        if (price !== undefined) dataToUpdate.price = price;
        if (rating !== undefined) dataToUpdate.rating = rating;
        if (mrp !== undefined) dataToUpdate.mrp = mrp ?? null;
        // Validated against the shared list, exactly like create — a rename of
        // the category's LABEL must not be typed into a product by hand.
        if (category !== undefined) {
            const resolved = await shopCategoryService.requireCategoryId(category, { allowEmpty: true });
            // Cleared (or an unrealised value) alongside a new name: classify the
            // name, exactly like create. Without a name to go on, the row is left
            // unclassified and the catalog filter still resolves it from the name
            // it already has.
            dataToUpdate.category = resolved || (productName !== undefined ? categoryRules.inferCategory(productName) : '');
        }
        if (gender !== undefined) dataToUpdate.gender = gender || null;
        if (description !== undefined) dataToUpdate.description = description || null;
        if (typeof isAvailable === 'boolean') {
            dataToUpdate.isAvailable = isAvailable;
            dataToUpdate.stockStatus = isAvailable ? 'available' : 'out_of_stock';
        }

        if (Object.keys(dataToUpdate).length === 0) {
            return response.status(400).json({ status: 'FAILED', message: 'No fields to update' });
        }

        const result = await shopProductService.update(productId, dataToUpdate);
        if (!result) {
            return response.status(404).json({ status: 'FAILED', message: 'Shop product not found' });
        }

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Shop product updated successfully',
            data: result
        });
    } catch (error) {
        console.log('error', error);
        return response.status(error.status || 500).json({ status: 'FAILED', message: error.message });
    }
};
module.exports = adminUpdateShopProduct;
