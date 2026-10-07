const router = require('express').Router();

const commissionController = require('../../controllers/admin/commissionController');
const transactionController = require('../../controllers/admin/transactionController');
const ridesController = require('../../controllers/admin/ridesController');
const authController = require('../../controllers/admin/authController');
const { getWithdrawalRequests, approveWithdrawal, rejectWithdrawal, getWithdrawalDetail } = require('../../controllers/admin/Adminwithdrawalcontroller');

// Protect all routes below with admin auth check
router.use(authController.checkAdmin);

// Commission Routes
router.route('/commission')
    .get(commissionController.getCommission)
    .post(commissionController.postCommission);

// Transaction Routes
router.get('/transactions', transactionController.getAllTransactions);

// Rides Routes
router.get('/rides', ridesController.getRides);

// Bookings / Rent Routes
router.get('/bookings', ridesController.getBookings);

// List all withdrawal requests (with filter tabs)
router.get('/withdrawals', getWithdrawalRequests);

// Approve (process) — triggers Stripe transfer
router.post('/withdrawals/:id/approve', approveWithdrawal);

// Reject — cancels and logs reason
router.post('/withdrawals/:id/reject', rejectWithdrawal);

// Detail JSON for modal
router.get('/withdrawals/:id/detail', getWithdrawalDetail);

module.exports = router;
