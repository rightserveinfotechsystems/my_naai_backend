const express = require('express');
const authenticateUserOrSalon = require('../utils/middleware/authUserOrSalon.middleware');
const { authenticateAdmin } = require('../utils/middleware/auth.middleware');
const { authenticateDistributorOrAdmin } = require('../utils/middleware/authDistributorOrAdmin.middleware');
const createShopOrder = require('../controller/shopOrder/createShopOrder');
const listShopOrders = require('../controller/shopOrder/listShopOrders');
const getShopOrderById = require('../controller/shopOrder/getShopOrderById');
const cancelShopOrder = require('../controller/shopOrder/cancelShopOrder');
const adminListShopOrders = require('../controller/shopOrder/adminListShopOrders');
const adminGetShopOrderById = require('../controller/shopOrder/adminGetShopOrderById');
const adminUpdateShopOrderStatus = require('../controller/shopOrder/adminUpdateShopOrderStatus');
const adminAssignDistributor = require('../controller/shopOrder/adminAssignDistributor');
const adminSetDeliveryLocation = require('../controller/shopOrder/adminSetDeliveryLocation');
const distributorAcceptOrder = require('../controller/shopOrder/distributorAcceptOrder');
const distributorRejectOrder = require('../controller/shopOrder/distributorRejectOrder');
const distributorListOrders = require('../controller/shopOrder/distributorListOrders');
const distributorUpdateOrderStatus = require('../controller/shopOrder/distributorUpdateOrderStatus');

const shopOrderRouter = express.Router();

// The BUYER's own orders — a salon (partner portal) or a customer (app /
// website). Either token is accepted; the buyer is resolved from it, so one
// account can never read or cancel another's parcel. They see the customer
// status track only.
shopOrderRouter.post('/create', authenticateUserOrSalon, createShopOrder);
shopOrderRouter.post('/list', authenticateUserOrSalon, listShopOrders);
shopOrderRouter.post('/get-by-id', authenticateUserOrSalon, getShopOrderById);
shopOrderRouter.post('/cancel', authenticateUserOrSalon, cancelShopOrder);

// Company admin — every salon's orders, both status tracks, distributor
// assignment. The admin/distributor view filters by distributorId.
shopOrderRouter.post('/admin-list', authenticateAdmin, adminListShopOrders);
shopOrderRouter.post('/admin-get-by-id', authenticateAdmin, adminGetShopOrderById);
shopOrderRouter.post('/admin-update-status', authenticateAdmin, adminUpdateShopOrderStatus);
shopOrderRouter.post('/admin-assign-distributor', authenticateAdmin, adminAssignDistributor);
// Place or correct the delivery pin on an order (map in the admin detail
// drawer); drives the KM shown while assigning a distributor.
shopOrderRouter.post('/admin-set-delivery-location', authenticateAdmin, adminSetDeliveryLocation);

// Distributor portal (distributor token) — the admin token is accepted too,
// so the admin can record a distributor's accept/reject on their behalf.
shopOrderRouter.post('/distributor-orders', authenticateDistributorOrAdmin, distributorListOrders);
shopOrderRouter.post('/distributor-accept', authenticateDistributorOrAdmin, distributorAcceptOrder);
shopOrderRouter.post('/distributor-reject', authenticateDistributorOrAdmin, distributorRejectOrder);
// After accepting, the distributor carries the parcel: ASSIGNED -> PICKED ->
// SHIPPED -> DELIVERED (next step only). Admin token accepted on their behalf.
shopOrderRouter.post('/distributor-update-status', authenticateDistributorOrAdmin, distributorUpdateOrderStatus);

module.exports = shopOrderRouter;
