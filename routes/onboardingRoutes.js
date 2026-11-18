const router = require('express').Router();
const { getOnboardingScreens } = require('../controllers/onboardingScreenController');

router.get('/', getOnboardingScreens);

module.exports = router;