const router = require('express').Router();

const authController = require('../../controllers/admin/authController');
const incentiveController = require('../../controllers/admin/Incentivecontroller');

const { checkAdmin } = authController;

router.get('/incentives', checkAdmin, incentiveController.listIncentives);

router.get('/incentives/add', checkAdmin, incentiveController.addIncentiveForm);
router.post('/incentives/add', checkAdmin, incentiveController.createIncentive);

router.get('/incentives/rewards', checkAdmin, incentiveController.rewardsReport);

router.get('/incentives/edit/:id', checkAdmin, incentiveController.editIncentiveForm);
router.post('/incentives/edit/:id', checkAdmin, incentiveController.updateIncentive);

router.post('/incentives/toggle/:id', checkAdmin, incentiveController.toggleIncentive);
router.post('/incentives/delete/:id', checkAdmin, incentiveController.deleteIncentive);

module.exports = router;