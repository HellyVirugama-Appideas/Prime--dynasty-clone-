const router = require('express').Router();

const fareController = require('../../controllers/admin/fareController');
const authController = require('../../controllers/admin/authController');
const reportsController = require('../../controllers/admin/Reports');

// Protect all routes below with admin auth check
router.use(authController.checkAdmin);

// Fare Settings (Phase 1 MVP Fare System)
router.route('/fare-settings')
    .get(fareController.getFareSettings)
    .post(fareController.postFareSettings);

// Trip-type / fare reports (Section 9 of the spec)
router.get('/fare-reports', reportsController.getFareReports);

module.exports = router;
