const express = require('express');
const authenticateUserOrSalon = require('../utils/middleware/authUserOrSalon.middleware');
const { authenticateAdmin } = require('../utils/middleware/auth.middleware');
const listShopCategories = require('../controller/shopCategory/listShopCategories');
const adminListShopCategories = require('../controller/shopCategory/adminListShopCategories');
const adminCreateShopCategory = require('../controller/shopCategory/adminCreateShopCategory');
const adminUpdateShopCategory = require('../controller/shopCategory/adminUpdateShopCategory');
const adminDeleteShopCategory = require('../controller/shopCategory/adminDeleteShopCategory');

/**
 * The shop's category list — one table, one list, four readers.
 *
 *   POST /api/shop-categories/list        the product editor + a signed-in shop
 *   POST /api/shop-public/categories/list the token-free storefront door
 *                                         (mounted in shopPublic.routes.js)
 *   POST /api/shop-categories/admin/*     the admin panel's manager
 *
 * A signed-in customer (app / website) and a salon both read the first door: a
 * category list is not private, but the token keeps the open endpoint from being
 * the only way in — and it is the door the panel's product editor uses, where a
 * token is always present.
 */
const shopCategoryRouter = express.Router();

shopCategoryRouter.post('/list', authenticateUserOrSalon, listShopCategories);

shopCategoryRouter.post('/admin/list', authenticateAdmin, adminListShopCategories);
shopCategoryRouter.post('/admin/create', authenticateAdmin, adminCreateShopCategory);
shopCategoryRouter.post('/admin/update', authenticateAdmin, adminUpdateShopCategory);
shopCategoryRouter.post('/admin/delete', authenticateAdmin, adminDeleteShopCategory);

module.exports = shopCategoryRouter;
