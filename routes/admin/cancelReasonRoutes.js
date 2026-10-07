const router = require('express').Router();

const cancelReasonController = require('../../controllers/admin/cancelReasonController');
const authController = require('../../controllers/admin/authController');

router.use(authController.checkAdmin);

router.get('/cancel-reasons', cancelReasonController.getCancelReasons);
router.post('/cancel-reasons', cancelReasonController.addCancelReason);
router.post('/cancel-reasons/:id/update', cancelReasonController.updateCancelReason);
router.post('/cancel-reasons/:id/toggle', cancelReasonController.toggleCancelReason);
router.post('/cancel-reasons/:id/delete', cancelReasonController.deleteCancelReason);

module.exports = router;