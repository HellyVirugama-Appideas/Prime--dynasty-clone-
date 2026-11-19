const router = require('express').Router();
const ctrl = require('../../controllers/admin/driverApplicationController');

// ⚠️ Yahan wahi admin auth middleware lagao jo baaki admin routes me lagta he, jaise:
// const { isAdmin } = require('../../middleware/adminAuth');
// router.use(isAdmin);

router.get('/', ctrl.list);
router.get('/:id', ctrl.detail);
router.post('/:id/approve', ctrl.approve);
router.post('/:id/resubmit', ctrl.resubmit);
router.post('/:id/reject', ctrl.reject);

module.exports = router;