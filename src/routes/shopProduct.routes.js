const express = require('express');
const { authenticateAdmin } = require('../utils/middleware/auth.middleware');
const listShopProducts = require('../controller/shopProduct/listShopProducts');
const adminListShopProducts = require('../controller/shopProduct/adminListShopProducts');
const adminCreateShopProduct = require('../controller/shopProduct/adminCreateShopProduct');
const adminUpdateShopProduct = require('../controller/shopProduct/adminUpdateShopProduct');
const adminDeleteShopProduct = require('../controller/shopProduct/adminDeleteShopProduct');
const downloadBulkTemplate = require('../controller/shopProduct/downloadBulkTemplate');
const bulkImportShopProducts = require('../controller/shopProduct/bulkImportShopProducts');
const undoBulkImport = require('../controller/shopProduct/undoBulkImport');
const { bulkUpload } = require('../utils/middleware/bulkUpload.middleware');

const shopProductRouter = express.Router();

// Buying-side catalog: mobile app (user token), web shop (salon token) and
// the PUBLIC website, which browses before anyone signs in. These are the
// COMPANY's shop products — a separate table from the salons'
// customer-facing products (/api/products/*) — and the response already
// carries only published fields (no cost price, no admin columns).
shopProductRouter.post('/list', listShopProducts);

// Company admin manages the catalog.
shopProductRouter.post('/admin-list', authenticateAdmin, adminListShopProducts);
shopProductRouter.post('/admin-create', authenticateAdmin, adminCreateShopProduct);
shopProductRouter.post('/admin-update', authenticateAdmin, adminUpdateShopProduct);
shopProductRouter.post('/admin-delete', authenticateAdmin, adminDeleteShopProduct);

// Bulk add from a spreadsheet: download the sample → fill it → upload it.
//
// The template is generated from the importer's own column list, and the import
// is ALWAYS run twice by the panel — once with `dryRun: true` (which writes
// nothing and answers the report) and once for real after the admin confirms.
// `undo` removes exactly what one import created.
shopProductRouter.get('/bulk/template', authenticateAdmin, downloadBulkTemplate);
shopProductRouter.post('/bulk/import', authenticateAdmin, bulkUpload, bulkImportShopProducts);
shopProductRouter.post('/bulk/undo', authenticateAdmin, undoBulkImport);

module.exports = shopProductRouter;
