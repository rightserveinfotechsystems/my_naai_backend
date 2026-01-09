const { deleteProductSchema } = require("../../validations/product.validation");
const productService = require ("../../services/product.service");
const deleteProduct = async (request, response) => {
    try{
        const salonId = request.salon?.salonId;
        const { productId} = request.body || {};

        if(!salonId){
            return response.status(400).json({
                status:'FAILED',
                message:'Salon Id not found in token'
            })
        }

        const validationResult = await deleteProductSchema.validate({productId}, {abortEarly:true});
        if(validationResult.error){
            return response.status(400).json({
                status:'FAILED',
                message:validationResult.error.details[0].message
            });
            }
         //check product exist
         const existingProduct = await productService.getProductById(productId);
         if(!existingProduct){
            return response.status(404).json({
                status:'FAILED',
                message:'Product not found'
            })
         }

         //delete product using serivice layer
         const result = await productService.deleteProduct(productId);
         if(result){
            return response.status(200).json({
                status:'SUCCESS',
                message: 'Product deleted successfully',
                data:result
            })
         }
           else{
            return response.status(400).json({
                status:'FAILED',
                message:'Failed to delete product'
            })
           }
        } catch(error) {
            console.error('Delete product error:',error);
            return response.status(500).json({
                status:'FAILED',
                message:error.message
            })
        }
        }
module.exports = deleteProduct;