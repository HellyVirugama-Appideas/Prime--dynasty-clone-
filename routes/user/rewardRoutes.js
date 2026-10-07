const router = require('express').Router();
const fileUpload = require('express-fileupload');
const { checkUser } = require('../../controllers/user/authController');
const rewardController = require('../../controllers/user/rewardController');

router.get('/rewards', checkUser, rewardController.getOffers);
router.post('/rewards/apply', fileUpload(), checkUser, rewardController.applyOffer);
router.get('/refer-earn', checkUser, rewardController.getReferEarn);
router.get('/rewards/history', checkUser, rewardController.getRewardHistory);

module.exports = router;