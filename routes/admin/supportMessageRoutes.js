const router = require('express').Router();
const ctrl = require('../../controllers/admin/supportMessageController');

// ⚠️ Yahan bhi admin auth middleware lagao
// router.use(isAdmin);

router.get('/', ctrl.list);
router.post('/:id/toggle', ctrl.toggle);

module.exports = router;