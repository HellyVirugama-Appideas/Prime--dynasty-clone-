const router = require('express').Router();
const fileUpload = require('express-fileupload');

const authController = require('../../controllers/user/authController');
const { upload } = require('../../middleware/upload');
const {checkUser} = require("../../controllers/user/authController")

router.post('/send_otp', fileUpload(), authController.sendOTP);

router.post('/verify_otp', fileUpload(), authController.verifyOTP);

router.post(
    '/create_profile',
    upload.fields([
        { name: 'profile', maxCount: 1 },
        { name: 'licenseFront', maxCount: 1 },
        { name: 'licenseBack', maxCount: 1 },
    ]),
    authController.createProfile
);

router.post('/social_login', fileUpload(), authController.socialLogin);

router.post(
    '/create_social_profile',
    upload.fields([
        { name: 'profile', maxCount: 1 },
        { name: 'licenseFront', maxCount: 1 },
        { name: 'licenseBack', maxCount: 1 },
    ]),
    authController.createSocialProfile
);

// Enable biometric (Protected - login ke baad)
router.post('/enable-biometric', checkUser, authController.enableBiometric);

// Biometric Login (Public)
router.post('/biometric-login', authController.biometricLogin);

// Disable biometric (Protected)
router.post('/disable-biometric', checkUser, authController.disableBiometric);

module.exports = router;
