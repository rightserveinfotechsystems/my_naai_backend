const express = require('express');
const { authenticateAdmin } = require('../utils/middleware/auth.middleware');
const createSalon = require('../controller/salon/createSalon');
const getSalonById = require('../controller/salon/getSalonById');
const updateSalon = require('../controller/salon/updateSalon');
const deleteSalon = require('../controller/salon/deleteSalon');
const toggleStatus = require('../controller/salon/toggleSalonStatus');
const toggleOpenClose = require('../controller/salon/toggleOpenCloseSalon');
const verifySalonOtpLogin = require('../controller/salon/salonLogin');
const { authenticateSalon } = require('../utils/middleware/authSalon.middleware');
const sendSalonOtp = require('../controller/salon/sendOtp');
const getSalonByIdApp = require('../controller/salon/getSalon');
const updateSalonApp = require('../controller/salon/updateSalonApp');
const authenticateUser = require('../utils/middleware/authUser.middleware');
const listSalonsApp = require('../controller/salon/salonList');
const getSalonByIdUser = require('../controller/salon/getSalonByIdUser');
const listSalons = require('../controller/salon/getSalonList');
const deleteSalonService = require('../controller/salon/deleteSalonService');
const saveSalonServices = require('../controller/salon/saveSalonServices');
const { getListFilter } = require('../controller/salon/getList');
const { getCityFilterUser } = require('../controller/salon/getFilterListUser');
const deleteService = require('../controller/salon/deleteServiceBySalon');
const { getNearbySalons } = require('../controller/salon/nearbySalons');
const verifySalonOtpRegister = require('../controller/salon/verifyOtpRegister');
const createPaymentOrder = require('../controller/razorpay/createPaymentOrder');
const createSalonWithPlan = require('../controller/razorpay/createSalonWithPlan');
const sendRegisterSalonOtp = require('../controller/salon/sendOtpRegister');
const checkPlanActive = require('../utils/middleware/checkPlanActive');
const deleteSalonByAdmin = require('../controller/salon/deleteSalonByAdmin');
const getSalonsByAgent = require('../controller/salon/salonsCreatedByAgent');
const renewSalonPlan = require('../controller/razorpay/renewSalonPlan');
const editSalonProfile = require('../controller/salon/editSalonProfile');
const getSalonListPublic = require('../controller/salon/get-salon-list-for-public');
const salonUpdateBookingTime = require('../controller/booking/update-booking-time');
const listPartnerPlans = require('../controller/salon/plan/listPartnerPlans');
const adminListPartnerPlans = require('../controller/salon/plan/adminListPartnerPlans');
const adminCreatePartnerPlan = require('../controller/salon/plan/adminCreatePartnerPlan');
const adminUpdatePartnerPlan = require('../controller/salon/plan/adminUpdatePartnerPlan');
const adminDeletePartnerPlan = require('../controller/salon/plan/adminDeletePartnerPlan');



const salonRouter = express.Router();


salonRouter.post('/send-register-otp', sendRegisterSalonOtp);
salonRouter.post('/verify-otp-register', verifySalonOtpRegister);
salonRouter.post('/create-payment-order', createPaymentOrder);
salonRouter.post('/create-salon-with-plan', createSalonWithPlan);


//Salon login
salonRouter.post('/send-otp', sendSalonOtp);
salonRouter.post('/login', verifySalonOtpLogin);
salonRouter.post('/nearby', getNearbySalons);
salonRouter.post('/get-salon', authenticateSalon, getSalonByIdApp);
salonRouter.post('/update-salon', authenticateSalon, updateSalonApp);
salonRouter.post('/delete-salon-service', authenticateSalon, deleteService);
salonRouter.post('/renew-salon-plan', authenticateSalon, renewSalonPlan);
salonRouter.post('/edit-salon-profile', authenticateSalon, editSalonProfile);
salonRouter.post('/delete-service', deleteSalonService);
// The menu editor's save: the whole list of services in one transaction, plus the
// ids to take off the menu. Authenticated as the salon, so the salon it writes is
// the one in the token — never one named in the body.
salonRouter.post('/services/save', authenticateSalon, saveSalonServices);



//user login   
salonRouter.post('/salon-list', authenticateUser, listSalonsApp);
salonRouter.post('/salon-list-public', getSalonListPublic);
// The partner price list — PUBLIC, like `/salon-list-public`: the registration
// screen shows prices before anyone has an account, and the admin panel owns
// what those prices are.
salonRouter.post('/plans/list', listPartnerPlans);
salonRouter.post('/get-salon-by-id', getSalonByIdUser);
salonRouter.get('/get-city-list', authenticateUser, getCityFilterUser)


// Salon operations

salonRouter.post('/open-close', toggleOpenClose);


// All routes require admin authentication
salonRouter.use(authenticateAdmin);

// Salon Admin routes
salonRouter.post('/create', createSalon);
salonRouter.get('/get-salon-list', listSalons);
salonRouter.get('/get-filter-list', getListFilter);
salonRouter.get('/get-salon-by-id/:salonId', getSalonById);
salonRouter.post('/admin-update-salon', updateSalon);
// salonRouter.delete('/delete-salon/:salonId', deleteSalon);
salonRouter.post('/delete-service', deleteSalonService);
salonRouter.post('/status', toggleStatus);
salonRouter.delete('/delete-salon-by-admin/:salonId', deleteSalonByAdmin);
salonRouter.post('/get-salon-by-agent', getSalonsByAgent);

// Partner plans — the ONE price list (admin panel → website → app).
salonRouter.post('/admin/plans/list', adminListPartnerPlans);
salonRouter.post('/admin/plans/create', adminCreatePartnerPlan);
salonRouter.post('/admin/plans/update', adminUpdatePartnerPlan);
salonRouter.post('/admin/plans/delete', adminDeletePartnerPlan);







module.exports = salonRouter;