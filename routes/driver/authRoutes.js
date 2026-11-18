// const router = require('express').Router();
// const fileUpload = require('express-fileupload');

// const authController = require('../../controllers/driver/authController');
// const { upload } = require('../../controllers/uploadController');

// router.post('/send_otp', fileUpload(), authController.sendOTP);

// router.post('/verify_otp', fileUpload(), authController.verifyOTP);

// router.post(
//     '/create_profile',
//     upload.single('profile'),
//     authController.createProfile
// );

// router.post('/social_login', fileUpload(), authController.socialLogin);

// router.post(
//     '/create_social_profile',
//     upload.single('profile'),
//     authController.createSocialProfile
// );

// router.get('/get_categories', authController.getCategories);
// router.get('/get_vehicle_types', authController.getVehicleTypes);
// router.post(
//     '/select_category',
//     fileUpload(),
//     authController.checkDriver,
//     authController.selectCategory
// );
// router.post(
//     '/select_vehicle_type',
//     fileUpload(),
//     authController.checkDriver,
//     authController.selectVehicleType
// );

// router.get('/get_docs', authController.checkDriver, authController.getDocs);
// router.post(
//     '/upload/profile',
//     authController.checkDriver,
//     upload.single('profile'),
//     authController.uploadProfile
// );
// router.post(
//     '/upload/licence',
//     authController.checkDriver,
//     upload.single('licence'),
//     authController.uploadLicence
// );
// router.post(
//     '/upload/pan',
//     authController.checkDriver,
//     upload.single('pan'),
//     authController.uploadPAN
// );
// router.post(
//     '/upload/rc',
//     authController.checkDriver,
//     upload.single('rc'),
//     authController.uploadRC
// );

// // ==================== BIOMETRIC LOGIN ====================
// router.post(
//     '/enable_biometric',
//     fileUpload(),
//     authController.checkDriver,
//     authController.enableBiometric
// );
// router.post(
//     '/disable_biometric',
//     fileUpload(),
//     authController.checkDriver,
//     authController.disableBiometric
// );
// router.post('/biometric_login', fileUpload(), authController.biometricLogin);

// module.exports = router;


const router = require('express').Router();
const fileUpload = require('express-fileupload');

const authController = require('../../controllers/driver/authController');
const { upload } = require('../../controllers/uploadController');

// ---------- Login (wapas aane wala driver) ----------
router.post('/send_otp', fileUpload(), authController.sendOTP);
router.post('/verify_otp', fileUpload(), authController.verifyOTP);
router.post('/social_login', fileUpload(), authController.socialLogin);

// ---------- Figma flow ----------
// Personal Information (account + SSN + License front/back)
router.post(
    '/register',
    upload.fields([
        { name: 'profile', maxCount: 1 },
        { name: 'licence_front', maxCount: 1 },
        { name: 'licence_back', maxCount: 1 },
    ]),
    authController.registerDriver
);

// Vehicle Information
router.get('/get_vehicle_types', authController.getVehicleTypes);
router.post(
    '/vehicle_info',
    authController.checkDriver,
    upload.fields([
        { name: 'insurance', maxCount: 1 },
        { name: 'vehicle_photo', maxCount: 1 },
    ]),
    authController.submitVehicleInfo
);

// Application Status
router.get('/application_status', authController.checkDriver, authController.getApplicationStatus);

// Document Resubmission
router.post(
    '/resubmit_document',
    authController.checkDriver,
    upload.fields([
        { name: 'licence_front', maxCount: 1 },
        { name: 'licence_back', maxCount: 1 },
        { name: 'insurance', maxCount: 1 },
        { name: 'vehicle_photo', maxCount: 1 },
    ]),
    authController.resubmitDocument
);

// Contact Us
router.get('/contact_subjects', authController.getContactSubjects);
router.post('/contact_us', fileUpload(), authController.checkDriver, authController.contactUs);

// ---------- Purane routes (jaise the waise) ----------
router.post('/create_profile', upload.single('profile'), authController.createProfile);
router.post('/create_social_profile', upload.single('profile'), authController.createSocialProfile);

router.get('/get_categories', authController.getCategories);
router.post('/select_category', fileUpload(), authController.checkDriver, authController.selectCategory);
router.post('/select_vehicle_type', fileUpload(), authController.checkDriver, authController.selectVehicleType);

router.get('/get_docs', authController.checkDriver, authController.getDocs);
router.post('/upload/profile', authController.checkDriver, upload.single('profile'), authController.uploadProfile);
router.post('/upload/licence', authController.checkDriver, upload.single('licence'), authController.uploadLicence);
router.post('/upload/pan', authController.checkDriver, upload.single('pan'), authController.uploadPAN);
router.post('/upload/rc', authController.checkDriver, upload.single('rc'), authController.uploadRC);

// ---------- Biometric login ----------
router.post('/enable_biometric', fileUpload(), authController.checkDriver, authController.enableBiometric);
router.post('/disable_biometric', fileUpload(), authController.checkDriver, authController.disableBiometric);
router.post('/biometric_login', fileUpload(), authController.biometricLogin);

module.exports = router;