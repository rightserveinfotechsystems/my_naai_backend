const productService = require("../../services/product.service");
const productList = async (request, resposne) => {
    try {
        const salonId = request.salon?.salonId;
        if (!salonId) {
            return resposne.status(400).json({
                status: 'FAILED',
                message: 'Salon Id not found in token'
            })
        }

        const { page = 1, searchString = '' } = request.body || {};

        const data = await productService.listProducts({ salonId, page, searchString });

        //if no products found
        if (!data.products || data.products.length === 0) {
            return resposne.status(200).json({
                status: 'Failed',
                message: 'No products found',
                data
            });
        }

        //return product list
        return resposne.status(200).json({
            status: 'SUCCESS',
            message: 'Product list fetched successfully',
            data
        });
    } catch (error) {
        return resposne.status(500).json({
            status: 'FAILED',
            message:error.message
        })
    }
}
module.exports = productList;