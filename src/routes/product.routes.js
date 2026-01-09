const express = require('express');
const { authenticateSalon } = require('../utils/middleware/authSalon.middleware');
const addProduct = require('../controller/product/createProduct');
const updateProduct = require('../controller/product/updateProduct');
const productList = require('../controller/product/getProductList');


const productRouter = express.Router();

productRouter.post('/create', authenticateSalon, addProduct);
productRouter.post('/update', authenticateSalon, updateProduct);
productRouter.post('/list', authenticateSalon, productList);



module.exports = productRouter;