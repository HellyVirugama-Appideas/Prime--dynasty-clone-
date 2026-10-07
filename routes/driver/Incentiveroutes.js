const router = require('express').Router();

const { checkDriver } = require('../../controllers/driver/authController');
const incentiveController = require('../../controllers/driver/Incentivecontroller');

// Incentives & Bonus screens
router.get('/incentives/daily', checkDriver, incentiveController.getDaily);
router.get('/incentives/weekly', checkDriver, incentiveController.getWeekly);
router.get('/incentives/bonus', checkDriver, incentiveController.getBonus);

module.exports = router;