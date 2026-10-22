const express = require('express');
const authenticateUserOrSalon = require('../utils/middleware/authUserOrSalon.middleware');
const getShopCart = require('../controller/shopCart/getShopCart');
const addToShopCart = require('../controller/shopCart/addToShopCart');
const setShopCartLineQty = require('../controller/shopCart/setShopCartLineQty');
const removeFromShopCart = require('../controller/shopCart/removeFromShopCart');
const clearShopCart = require('../controller/shopCart/clearShopCart');

// The cart belongs to the BUYER's account — the same identity that owns the
// shop orders — so web and mobile app share it. Either a salon token (partner
// portal) or a user token (customer app / website) is accepted; which one it
// was decides whose cart this is.
const shopCartRouter = express.Router();
shopCartRouter.use(authenticateUserOrSalon);

shopCartRouter.post('/get', getShopCart);
shopCartRouter.post('/add', addToShopCart);
shopCartRouter.post('/set-qty', setShopCartLineQty);
shopCartRouter.post('/remove', removeFromShopCart);
shopCartRouter.post('/clear', clearShopCart);

module.exports = shopCartRouter;
