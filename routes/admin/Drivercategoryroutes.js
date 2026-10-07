const router = require('express').Router();

const ctrl = require('../../controllers/admin/Drivercategorycontroller');
const authController = require('../../controllers/admin/authController');
const { upload } = require('../../middleware/upload');

router.use(authController.checkAdmin);

router.get('/driver-category', ctrl.getCategories);
router.post('/driver-category', upload.single('image'), ctrl.postSaveCategory);
router.get('/driver-category/toggle/:id', ctrl.getToggleCategory);

module.exports = router;