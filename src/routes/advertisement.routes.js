const express = require('express');
const createAdvertisement = require('../controller/advertisement/createAdvertisement');
const { authenticateAdmin } = require('../utils/middleware/auth.middleware');
const listAdvertisementsAdmin = require('../controller/advertisement/getAdvertisementList');
const { getAdvertisementUser } = require('../controller/advertisement/getAdvertisementUser');
const authenticateUser = require('../utils/middleware/authUser.middleware');
const updateAdvertisement = require('../controller/advertisement/updateAdvertisement');
const toggleAdvertisementStatus = require('../controller/advertisement/toggleAdvertisement');
const deleteAdvertisement = require('../controller/advertisement/deleteAdvertisement');

const advertisementRouter = express.Router();

advertisementRouter.post('/create',authenticateAdmin, createAdvertisement);
advertisementRouter.post('/get-list',authenticateAdmin, listAdvertisementsAdmin);
advertisementRouter.post('/update',authenticateAdmin, updateAdvertisement);
advertisementRouter.post('/status',authenticateAdmin,toggleAdvertisementStatus);
advertisementRouter.post('/delete',authenticateAdmin, deleteAdvertisement);



advertisementRouter.get('/get-advertisement',authenticateUser, getAdvertisementUser);






module.exports = advertisementRouter;