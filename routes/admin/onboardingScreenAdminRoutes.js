const router = require('express').Router();
const { upload } = require('../../middleware/upload');
const ctrl = require('../../controllers/admin/onboardingScreenAdminController');

// ⚠️ Yahan wahi admin auth middleware lagao jo baaki admin routes me lagta he, jaise:
// const { isAdmin } = require('../../middleware/adminAuth');
// router.use(isAdmin);

router.get('/', ctrl.list);

router.get('/add', ctrl.getAdd);
router.post('/add', upload.single('image'), ctrl.postAdd);

router.get('/edit/:id', ctrl.getEdit);
router.post('/edit/:id', upload.single('image'), ctrl.postEdit);

router.post('/toggle/:id', ctrl.toggleStatus);
router.post('/delete/:id', ctrl.remove);

module.exports = router;