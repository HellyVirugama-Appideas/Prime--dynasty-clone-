// const { promisify } = require('util');
// const createError = require('http-errors');
// // const validator = require('validator');
// const crypto = require('crypto');
// const bcrypt = require('bcryptjs');
// const multilingual = require('../../utils/multilingual');
// const multilingualUser = require('../../utils/multilingualUser');
// const generateCode = require('../../utils/generateCode');
// const jwt = require('jsonwebtoken');
// const deleteFile = require('../../utils/deleteFile');
// const { sendOTP } = require('../../utils/sendSMS');

// const Driver = require('../../models/driverModel');
// const OTP = require('../../models/otpModel');
// const City = require('../../models/cityModel');
// const Country = require('../../models/countryModel');
// const Type = require('../../models/typeModel');

// exports.checkDriver = async (req, res, next) => {
//     try {
//         const token = req.headers.token;
//         console.log('token: ', token);

//         if (!token) return next(createError.BadRequest('auth.provideToken'));

//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         console.log('decoded: ', decoded);

//         let driver = await Driver.findById(decoded._id).select(
//             '+blocked +password'
//         );

//         // if (!driver) return next(createError.BadRequest('auth.login'));
//         console.log('driver: ', driver);
//         if (driver.blocked)
//             return next(createError.Unauthorized('auth.blocked'));
//         if (driver.isDeleted)
//             return next(createError.Unauthorized('auth.deleted'));

//         req.driver = driver;
//         next();
//     } catch (error) {
//         next(error);
//     }
// };

// exports.sendOTP = async (req, res, next) => {
//     try {
//         const { country_code, phone } = req.body;

//         if (!country_code)
//             return next(createError.BadRequest('validation.country_code'));
//         if (!phone) return next(createError.BadRequest('validation.phone'));

//         const mobile = country_code + phone;

//         const otp = generateCode(4);
//         await OTP.updateOne(
//             { mobile },
//             { otp, expireAt: Date.now() + 2 * 60 * 1000 },
//             { upsert: true }
//         );

//         // send OTP
//         // await sendOTP(mobile, otp);

//         res.json({
//             code: '1',
//             message: req.t('otp.sent'),
//             result: {
//                 otp,
//                 country_code,
//                 phone,
//             },
//         });
//     } catch (error) {
//         next(error);
//     }
// };

// exports.verifyOTP = async (req, res, next) => {
//     try {
//         const { country_code, phone, otp } = req.body;
//         const mobile = country_code + phone;

//         const otpVerified = await OTP.findOne({ mobile, otp });
//         if (!otpVerified) return next(createError.BadRequest('otp.fail'));

//         let driver = await Driver.findOne({ phone })
//             .select('-__v')
//             .populate('city country');

//         if (driver) {
//             driver.isHandlingRequest = false;
//             driver.fcmToken = req.body.fcmToken;
//             await driver.save();
//             const token = await driver.generateAuthToken();

//             driver = multilingualUser(driver, req);

//             if (driver.location.coordinates) {
//                 driver.latitude = driver.location.coordinates[1];
//                 driver.longitude = driver.location.coordinates[0];
//             }

//             driver.location = undefined;

//             return res.json({
//                 code: '1',
//                 message: req.t('loggedIn'),
//                 token,
//                 driver,
//             });
//         }

//         const verifyToken = jwt.sign(
//             { country_code, phone },
//             process.env.JWT_SECRET,
//             { expiresIn: '1d' }
//         );

//         res.json({
//             code: '001',
//             message: req.t('otp.verified'),
//             verifyToken,
//             country_code,
//             phone,
//         });
//     } catch (error) {
//         next(error);
//     }
// };

// // exports.createProfile = async (req, res, next) => {
// //     try {
// //         const decoded = await promisify(jwt.verify)(req.body.verifyToken, process.env.JWT_SECRET);
// //         if (!decoded.phone) return next(createError.BadRequest('phone.verify'));
// //         if (!req.body.fcmToken) return next(createError.BadRequest('fcmToken is required.'));

// //         const { city, country } = req.body;
// //         const [cityDoc, countryDoc] = await Promise.all([
// //             City.findOne({ city_id: city }),
// //             Country.findOne({ country_id: country }),
// //         ]);

// //         const profile = req.file ? `/uploads/${req.file.filename}` : undefined;

// //         let driver = await Driver.create({
// //             name: req.body.name,
// //             email: req.body.email,
// //             country_code: decoded.country_code,
// //             phone: decoded.phone,
// //             city: cityDoc?.id,
// //             country: countryDoc?.id,
// //             address: req.body.address,
// //             useFor: req.body.useFor,    
// //             profile,
// //             fcmToken: req.body.fcmToken,
// //         });

// //         const token = await driver.generateAuthToken();
// //         await driver.populate('city country');
// //         driver = multilingualUser(driver, req);

// //         driver.password = undefined;
// //         driver.__v = undefined;
// //         driver.location = undefined;

// //         res.status(201).json({
// //             code: '1',
// //             message: req.t('profile'),
// //             token,
// //             driver,
// //         });

// //     } catch (error) {
// //         if (req.file) deleteFile(req.file.path);
// //         if (error.name === 'JsonWebTokenError') return next(createError.BadRequest('token.invalid'));
// //         if (error.name === 'TokenExpiredError') return next(createError.BadRequest('token.expired'));
// //         next(error);
// //     }
// // };
// exports.createProfile = async (req, res, next) => {
//     try {
//         const decoded = await promisify(jwt.verify)(req.body.verifyToken, process.env.JWT_SECRET);
//         if (!decoded.phone) return next(createError.BadRequest('phone.verify'));
//         if (!req.body.fcmToken) return next(createError.BadRequest('fcmToken is required.'));

//         const { city, country } = req.body;

//         if (!city) return next(createError.BadRequest('city is required.'));
//         if (!country) return next(createError.BadRequest('country is required.'));

//         const [cityDoc, countryDoc] = await Promise.all([
//             City.findOne({ city_id: city }),
//             Country.findOne({ country_id: country }),
//         ]);

//         // ✅ Ab clearly bata dega agar city/country ka wo ID exist hi nahi karta
//         if (!cityDoc) return next(createError.BadRequest(`Invalid city id: ${city}`));
//         if (!countryDoc) return next(createError.BadRequest(`Invalid country id: ${country}`));

//         const profile = req.file ? `/uploads/${req.file.filename}` : undefined;

//         let driver = await Driver.create({
//             name: req.body.name,
//             email: req.body.email,
//             country_code: decoded.country_code,
//             phone: decoded.phone,
//             city: cityDoc.id,
//             country: countryDoc.id,
//             address: req.body.address,
//             useFor: req.body.useFor,    
//             profile,
//             fcmToken: req.body.fcmToken,
//         });

//         const token = await driver.generateAuthToken();
//         await driver.populate('city country');
//         driver = multilingualUser(driver, req);

//         driver.password = undefined;
//         driver.__v = undefined;
//         driver.location = undefined;

//         res.status(201).json({
//             code: '1',
//             message: req.t('profile'),
//             token,
//             driver,
//         });

//     } catch (error) {
//         if (req.file) deleteFile(req.file.path);
//         if (error.name === 'JsonWebTokenError') return next(createError.BadRequest('token.invalid'));
//         if (error.name === 'TokenExpiredError') return next(createError.BadRequest('token.expired'));
//         next(error);
//     }
// };

// exports.socialLogin = async (req, res, next) => {
//     try {
//         const { email, googleId, facebookId, appleId } = req.body;

//         let driver = await Driver.findOne({ email }).populate('city country');

//         if (!driver) {
//             return res.json({
//                 code: '001',
//                 message: req.t('success'),
//                 driver: { email, googleId, facebookId, appleId },
//             });
//         }

//         if (googleId) {
//             if (!driver.googleId) {
//                 const errorMessage = driver.facebookId
//                     ? 'social.facebook'
//                     : driver.appleId
//                     ? 'social.apple'
//                     : 'social.phone';
//                 return next(createError.BadRequest(errorMessage));
//             }
//             if (googleId !== driver.googleId) {
//                 return next(createError.BadRequest('social.invalidGoogle'));
//             }
//         }

//         if (facebookId) {
//             if (!driver.facebookId) {
//                 const errorMessage = driver.googleId
//                     ? 'social.google'
//                     : driver.appleId
//                     ? 'social.apple'
//                     : 'social.phone';
//                 return next(createError.BadRequest(errorMessage));
//             }
//             if (facebookId !== driver.facebookId) {
//                 return next(createError.BadRequest('social.invalidFacebook'));
//             }
//         }

//         if (appleId) {
//             if (!driver.appleId) {
//                 const errorMessage = driver.googleId
//                     ? 'social.google'
//                     : driver.facebookId
//                     ? 'social.facebook'
//                     : 'social.phone';
//                 return next(createError.BadRequest(errorMessage));
//             }
//             if (appleId !== driver.appleId) {
//                 return next(createError.BadRequest('social.invalidApple'));
//             }
//         }

//         driver.isHandlingRequest = false;
//         driver.fcmToken = req.body.fcmToken;
//         await driver.save();
//         const token = await driver.generateAuthToken();
//         driver = multilingualUser(driver, req);

//         if (driver.location.coordinates) {
//             driver.latitude = driver.location.coordinates[1];
//             driver.longitude = driver.location.coordinates[0];
//         }

//         driver.password = undefined;
//         driver.__v = undefined;
//         driver.location = undefined;

//         return res.json({
//             code: '1',
//             message: req.t('loggedIn'),
//             token,
//             driver,
//         });
//     } catch (error) {
//         next(error);
//     }
// };

// exports.createSocialProfile = async (req, res, next) => {
//     try {
//         const { city_id, country_id } = req.body;
//         const [city, country] = await Promise.all([
//             City.findOne({ city_id }),
//             Country.findOne({ country_id }),
//         ]);
//         if (!req.body.fcmToken) return next(createError.BadRequest('fcmToken is required.'));

//         const profile = req.file ? `/uploads/${req.file.filename}` : undefined;

//         let driver = await Driver.create({
//             name: req.body.name,
//             email: req.body.email,
//             country_code: req.body.country_code,
//             phone: req.body.phone,
//             city: city?.id,
//             country: country?.id,
//             address: req.body.address,
//             useFor: req.body.useFor,
//             googleId: req.body.googleId,
//             facebookId: req.body.facebookId,
//             appleId: req.body.appleId,
//             profile,
//             fcmToken: req.body.fcmToken,
//         });

//         const token = await driver.generateAuthToken();
//         await driver.populate('city country');
//         driver = multilingualUser(driver, req);

//         driver.password = undefined;
//         driver.__v = undefined;
//         driver.location = undefined;

//         res.status(201).json({
//             code: '1',
//             message: req.t('profile'),
//             token,
//             driver,
//         });

//     } catch (error) {
//         if (req.file) deleteFile(req.file.path);
//         if (error.name === 'JsonWebTokenError') return next(createError.BadRequest('token.invalid'));
//         if (error.name === 'TokenExpiredError') return next(createError.BadRequest('token.expired'));
//         next(error);
//     }
// };

// exports.getVehicleTypes = async (req, res, next) => {
//     try {
//         let types = await Type.find().select('-__v -typeFor -distanceRate');
//         types = types.map(type => multilingual(type, req));

//         res.json({ code: '1', message: req.t('success'), data: { types } });
//     } catch (error) {
//         next(error);
//     }
// };

// exports.selectVehicleType = async (req, res, next) => {
//     try {
//         const type = await Type.findById(req.body.type);
//         if (!type)
//             return next(createError.BadRequest('Invalid vehicle type id.'));

//         let driver = await Driver.findByIdAndUpdate(
//             req.driver.id,
//             { type: req.body.type },
//             { new: true }
//         ).populate('city country');

//         driver = multilingualUser(driver, req);

//         if (driver.location.coordinates) {
//             driver.latitude = driver.location.coordinates[1];
//             driver.longitude = driver.location.coordinates[0];
//         }

//         driver.location = undefined;
//         driver.__v = undefined;

//         res.json({ code: '1', message: req.t('success'), driver });
//     } catch (error) {
//         next(error);
//     }
// };

// exports.getDocs = async (req, res, next) => {
//     try {
//         const driver = req.driver;

//         const obj = { profile: 1, licence: 1, pan: 1, rc: 1 };

//         if (!driver.profile) {
//             obj.profile = 0;
//             obj.licence = driver.licence ? 1 : 2;
//             obj.pan = driver.pan ? 1 : 2;
//             obj.rc = driver.rc ? 1 : 2;
//         } else if (!driver.licence) {
//             obj.licence = 0;
//             obj.pan = driver.pan ? 1 : 2;
//             obj.rc = driver.rc ? 1 : 2;
//         } else if (!driver.pan) {
//             obj.pan = 0;
//             obj.rc = driver.rc ? 1 : 2;
//         } else if (!driver.rc) {
//             obj.rc = 0;
//         }

//         const data = Object.entries(obj).map(([title, status]) => ({
//             title,
//             status,
//             url: req.driver[title],
//         }));

//         res.json({ code: '1', message: req.t('success'), data });
//     } catch (error) {
//         next(error);
//     }
// };

// exports.uploadProfile = async (req, res, next) => {
//     try {
//         if (!req.file) return next(createError.BadRequest('Please upload file.'));

//         if (req.driver.profile) deleteFile(`public${req.driver.profile}`);
//         const profile = `/uploads/${req.file.filename}`;

//         let driver = await Driver.findByIdAndUpdate(
//             req.driver.id,
//             { profile },
//             { new: true }
//         ).populate('city country');

//         driver = multilingualUser(driver, req);
//         if (driver.location?.coordinates) {
//             driver.latitude = driver.location.coordinates[1];
//             driver.longitude = driver.location.coordinates[0];
//         }

//         driver.location = undefined;
//         driver.__v = undefined;

//         res.json({ code: '1', message: req.t('success'), driver });
//     } catch (error) {
//         if (req.file) deleteFile(req.file.path);
//         next(error);
//     }
// };

// exports.uploadLicence = async (req, res, next) => {
//     try {
//         if (!req.file) return next(createError.BadRequest('Please upload file.'));

//         if (req.driver.licence) deleteFile(`public${req.driver.licence}`);
//         const licence = `/uploads/${req.file.filename}`;

//         let driver = await Driver.findByIdAndUpdate(
//             req.driver.id,
//             { licence },
//             { new: true }
//         ).populate('city country');

//         driver = multilingualUser(driver, req);
//         if (driver.location?.coordinates) {
//             driver.latitude = driver.location.coordinates[1];
//             driver.longitude = driver.location.coordinates[0];
//         }

//         driver.location = undefined;
//         driver.__v = undefined;

//         res.json({ code: '1', message: req.t('success'), driver });
//     } catch (error) {
//         if (req.file) deleteFile(req.file.path);
//         next(error);
//     }
// };

// exports.uploadPAN = async (req, res, next) => {
//     try {
//         if (!req.file) return next(createError.BadRequest('Please upload file.'));

//         if (req.driver.pan) deleteFile(`public${req.driver.pan}`);
//         const pan = `/uploads/${req.file.filename}`;

//         let driver = await Driver.findByIdAndUpdate(
//             req.driver.id,
//             { pan },
//             { new: true }
//         ).populate('city country');

//         driver = multilingualUser(driver, req);
//         if (driver.location?.coordinates) {
//             driver.latitude = driver.location.coordinates[1];
//             driver.longitude = driver.location.coordinates[0];
//         }

//         driver.location = undefined;
//         driver.__v = undefined;

//         res.json({ code: '1', message: req.t('success'), driver });
//     } catch (error) {
//         if (req.file) deleteFile(req.file.path);
//         next(error);
//     }
// };

// exports.uploadRC = async (req, res, next) => {
//     try {
//         if (!req.file) return next(createError.BadRequest('Please upload file.'));

//         if (req.driver.rc) deleteFile(`public${req.driver.rc}`);
//         const rc = `/uploads/${req.file.filename}`;

//         let driver = await Driver.findByIdAndUpdate(
//             req.driver.id,
//             { rc },
//             { new: true }
//         ).populate('city country');

//         driver = multilingualUser(driver, req);
//         if (driver.location?.coordinates) {
//             driver.latitude = driver.location.coordinates[1];
//             driver.longitude = driver.location.coordinates[0];
//         }

//         driver.location = undefined;
//         driver.__v = undefined;

//         res.json({ code: '1', message: req.t('success'), driver });
//     } catch (error) {
//         if (req.file) deleteFile(req.file.path);
//         next(error);
//     }
// };

// // ==================== BIOMETRIC LOGIN ====================

// // POST /driver/enable_biometric (protected — checkDriver)
// // Called once, right after a normal OTP/social login, when the driver turns
// // on "Login with Fingerprint/Face" in app settings. Generates a random
// // secret, stores only its bcrypt hash in DB, and returns the RAW secret to
// // the app — the app must store this raw value in the device's secure
// // keystore (behind the OS biometric prompt), never in plain preferences.
// exports.enableBiometric = async (req, res, next) => {
//     try {
//         const rawToken = crypto.randomBytes(32).toString('hex');
//         const hashedToken = await bcrypt.hash(rawToken, 10);

//         await Driver.findByIdAndUpdate(req.driver.id, {
//             biometricEnabled: true,
//             biometricToken: hashedToken,
//         });

//         res.json({
//             code: '1',
//             message: req.t('success'),
//             data: {
//                 driverId: req.driver.id,
//                 biometricToken: rawToken, // ⚠️ shown only once — store securely on device
//             },
//         });
//     } catch (error) {
//         next(error);
//     }
// };

// // POST /driver/disable_biometric (protected — checkDriver)
// exports.disableBiometric = async (req, res, next) => {
//     try {
//         await Driver.findByIdAndUpdate(req.driver.id, {
//             biometricEnabled: false,
//             $unset: { biometricToken: 1 },
//         });

//         res.json({ code: '1', message: req.t('success') });
//     } catch (error) {
//         next(error);
//     }
// };

// // POST /driver/biometric_login (public — no token header, this IS the login)
// // Body: { driverId, biometricToken, fcmToken }
// exports.biometricLogin = async (req, res, next) => {
//     try {
//         const { driverId, biometricToken, fcmToken } = req.body;

//         if (!driverId || !biometricToken) {
//             return next(createError.BadRequest('driverId and biometricToken are required.'));
//         }

//         let driver = await Driver.findById(driverId)
//             .select('+biometricToken +blocked')
//             .populate('city country');

//         if (!driver) return next(createError.NotFound('Driver not found.'));
//         if (driver.blocked) return next(createError.Unauthorized('auth.blocked'));
//         if (driver.isDeleted) return next(createError.Unauthorized('auth.deleted'));

//         if (!driver.biometricEnabled || !driver.biometricToken) {
//             return next(createError.BadRequest('Biometric login is not enabled for this account.'));
//         }

//         const isMatch = await bcrypt.compare(biometricToken, driver.biometricToken);
//         if (!isMatch) {
//             return next(createError.Unauthorized('Invalid biometric credentials.'));
//         }

//         driver.isHandlingRequest = false;
//         if (fcmToken) driver.fcmToken = fcmToken;
//         await driver.save();

//         const token = await driver.generateAuthToken();
//         driver = multilingualUser(driver, req);

//         if (driver.location?.coordinates) {
//             driver.latitude = driver.location.coordinates[1];
//             driver.longitude = driver.location.coordinates[0];
//         }

//         driver.location = undefined;
//         driver.__v = undefined;
//         driver.biometricToken = undefined;

//         res.json({
//             code: '1',
//             message: req.t('loggedIn'),
//             token,
//             driver,
//         });
//     } catch (error) {
//         if (error.name === 'CastError') {
//             return next(createError.BadRequest('Invalid driverId.'));
//         }
//         next(error);
//     }
// };


const { promisify } = require('util');
const createError = require('http-errors');
const validator = require('validator');

const SupportMessage = require('../../models/supportMessageModel');
const { normalizeSSN, hashSSN } = require('../../utils/ssn');
const {
    DOC_LABELS,
    DOC_FIELD_MAP,
    CONTACT_SUBJECTS,
    isPersonalComplete,
    getApplicationStatus,
    buildApplicationInfo,
    buildStatusScreen,
} = require('../../utils/driverApplication');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const multilingual = require('../../utils/multilingual');
const multilingualUser = require('../../utils/multilingualUser');
const generateCode = require('../../utils/generateCode');
const jwt = require('jsonwebtoken');
const deleteFile = require('../../utils/deleteFile');
const { sendOTP } = require('../../utils/sendSMS');

const Driver = require('../../models/driverModel');
const OTP = require('../../models/otpModel');
const City = require('../../models/cityModel');
const Country = require('../../models/countryModel');
const Type = require('../../models/typeModel');
const Car = require('../../models/carModel');
const { getActiveCategories, findActiveCategory } = require('../../utils/driverCategory');

// exports.checkDriver = async (req, res, next) => {
//     try {
//         const token = req.headers.token;
//         console.log('token: ', token);

//         if (!token) return next(createError.BadRequest('auth.provideToken'));

//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         console.log('decoded: ', decoded);

//         let driver = await Driver.findById(decoded._id).select(
//             '+blocked +password'
//         );

//         // if (!driver) return next(createError.BadRequest('auth.login'));
//         console.log('driver: ', driver);
//         if (driver.blocked)
//             return next(createError.Unauthorized('auth.blocked'));
//         if (driver.isDeleted)
//             return next(createError.Unauthorized('auth.deleted'));

//         req.driver = driver;
//         next();
//     } catch (error) {
//         next(error);
//     }
// };

exports.checkDriver = async (req, res, next) => {
    try {
        const token = req.headers.token;
        console.log('token: ', token);

        if (!token) return next(createError.BadRequest('auth.provideToken'));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('decoded: ', decoded);

        let driver = await Driver.findById(decoded._id).select(
            '+blocked +password'
        );

        // Token valid hai par is _id ka driver DB me nahi hai -> crash ki jagah saaf error
        if (!driver) {
            console.log('driver not found for token _id:', decoded._id);
            return next(createError.Unauthorized('auth.login'));
        }

        console.log('driver: ', driver);
        if (driver.blocked)
            return next(createError.Unauthorized('auth.blocked'));
        if (driver.isDeleted)
            return next(createError.Unauthorized('auth.deleted'));

        req.driver = driver;
        next();
    } catch (error) {
        next(error);
    }
};

exports.sendOTP = async (req, res, next) => {
    try {
        const { country_code, phone } = req.body;

        // validate mobile
        if (!country_code)
            return next(createError.BadRequest('validation.country_code'));
        if (!phone) return next(createError.BadRequest('validation.phone'));

        const mobile = country_code + phone;
        // if (!validator.isMobilePhone(mobile, 'any', { strictMode: true }))
        //     return next(createError.BadRequest('validation.mobileInvalid'));

        // generate and save OTP
        const otp = generateCode(4);
        await OTP.updateOne(
            { mobile },
            { otp, expireAt: Date.now() + 2 * 60 * 1000 },
            { upsert: true }
        );

        // send OTP
        // await sendOTP(mobile, otp);

        res.json({
            code: '1',
            message: req.t('otp.sent'),
            result: {
                otp,
                country_code,
                phone,
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.verifyOTP = async (req, res, next) => {
    try {
        const { country_code, phone, otp } = req.body;

        if (!country_code || !phone || !otp) {
            return next(createError.BadRequest('country_code, phone and otp are required.'));
        }

        const mobile = country_code + phone;

        const otpVerified = await OTP.findOne({ mobile, otp });
        if (!otpVerified) return next(createError.BadRequest('otp.fail'));

        let driver = await Driver.findOne({ phone })
            .select('-__v')
            .populate('city country');

        // ---------- Naya number: register screen + verifyToken ----------
        if (!driver) {
            const verifyToken = jwt.sign(
                { purpose: 'register', country_code, phone },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );

            return res.json({
                code: '001',
                message: req.t('otp.verified'),
                verifyToken,
                country_code,
                phone,
            });
        }

        // ---------- Purana driver: login ----------
        driver.isHandlingRequest = false;
        driver.fcmToken = req.body.fcmToken;
        await driver.save();
        const token = await driver.generateAuthToken();

        const application = buildApplicationInfo(driver);
        driver = multilingualUser(driver, req);

        if (driver.location?.coordinates) {
            driver.latitude = driver.location.coordinates[1];
            driver.longitude = driver.location.coordinates[0];
        }
        driver.location = undefined;
        driver.application = application;

        return res.json({
            code: '1',
            message: req.t('loggedIn'),
            token,
            driver,
        });
    } catch (error) {
        next(error);
    }
};
exports.createProfile = async (req, res, next) => {
    try {
        const decoded = await promisify(jwt.verify)(req.body.verifyToken, process.env.JWT_SECRET);
        if (!decoded.phone) return next(createError.BadRequest('phone.verify'));
        if (!req.body.fcmToken) return next(createError.BadRequest('fcmToken is required.'));

        const { city, country } = req.body;
        const [cityDoc, countryDoc] = await Promise.all([
            City.findOne({ city_id: city }),
            Country.findOne({ country_id: country }),
        ]);

        const profile = req.file ? `/uploads/${req.file.filename}` : undefined;

        let driver = await Driver.create({
            name: req.body.name,
            email: req.body.email,
            country_code: decoded.country_code,
            phone: decoded.phone,
            city: cityDoc?.id,
            country: countryDoc?.id,
            address: req.body.address,
            useFor: req.body.useFor,
            profile,
            fcmToken: req.body.fcmToken,
        });

        const token = await driver.generateAuthToken();
        await driver.populate('city country');
        driver = multilingualUser(driver, req);

        driver.password = undefined;
        driver.__v = undefined;
        driver.location = undefined;

        res.status(201).json({
            code: '1',
            message: req.t('profile'),
            token,
            driver,
        });

    } catch (error) {
        if (req.file) deleteFile(req.file.path);
        if (error.name === 'JsonWebTokenError') return next(createError.BadRequest('token.invalid'));
        if (error.name === 'TokenExpiredError') return next(createError.BadRequest('token.expired'));
        next(error);
    }
};

exports.socialLogin = async (req, res, next) => {
    try {
        const { email, googleId, facebookId, appleId } = req.body;

        let driver = await Driver.findOne({ email }).populate('city country');

        // if driver exists, redirect to create profile screen
        if (!driver) {
            return res.json({
                code: '001',
                message: req.t('success'),
                driver: { email, googleId, facebookId, appleId },
            });
        }
        // if (!req.body.fcmToken)
        //     return next(createError.BadRequest('fcmToken is required.'));

        if (googleId) {
            if (!driver.googleId) {
                const errorMessage = driver.facebookId
                    ? 'social.facebook'
                    : driver.appleId
                        ? 'social.apple'
                        : 'social.phone';
                return next(createError.BadRequest(errorMessage));
            }
            if (googleId !== driver.googleId) {
                return next(createError.BadRequest('social.invalidGoogle'));
            }
        }

        if (facebookId) {
            if (!driver.facebookId) {
                const errorMessage = driver.googleId
                    ? 'social.google'
                    : driver.appleId
                        ? 'social.apple'
                        : 'social.phone';
                return next(createError.BadRequest(errorMessage));
            }
            if (facebookId !== driver.facebookId) {
                return next(createError.BadRequest('social.invalidFacebook'));
            }
        }

        if (appleId) {
            if (!driver.appleId) {
                const errorMessage = driver.googleId
                    ? 'social.google'
                    : driver.facebookId
                        ? 'social.facebook'
                        : 'social.phone';
                return next(createError.BadRequest(errorMessage));
            }
            if (appleId !== driver.appleId) {
                return next(createError.BadRequest('social.invalidApple'));
            }
        }

        driver.isHandlingRequest = false;
        driver.fcmToken = req.body.fcmToken;
        await driver.save();
        const token = await driver.generateAuthToken();
        driver = multilingualUser(driver, req);

        if (driver.location.coordinates) {
            driver.latitude = driver.location.coordinates[1];
            driver.longitude = driver.location.coordinates[0];
        }

        // Hide fields
        driver.password = undefined;
        driver.__v = undefined;
        driver.location = undefined;

        return res.json({
            code: '1',
            message: req.t('loggedIn'),
            token,
            driver,
        });
    } catch (error) {
        next(error);
    }
};

exports.createSocialProfile = async (req, res, next) => {
    try {
        const { city_id, country_id } = req.body;
        const [city, country] = await Promise.all([
            City.findOne({ city_id }),
            Country.findOne({ country_id }),
        ]);
        if (!req.body.fcmToken) return next(createError.BadRequest('fcmToken is required.'));

        const profile = req.file ? `/uploads/${req.file.filename}` : undefined;

        let driver = await Driver.create({
            name: req.body.name,
            email: req.body.email,
            country_code: req.body.country_code,
            phone: req.body.phone,
            city: city?.id,
            country: country?.id,
            address: req.body.address,
            useFor: req.body.useFor,
            googleId: req.body.googleId,
            facebookId: req.body.facebookId,
            appleId: req.body.appleId,
            profile,
            fcmToken: req.body.fcmToken,
        });

        const token = await driver.generateAuthToken();
        await driver.populate('city country');
        driver = multilingualUser(driver, req);

        driver.password = undefined;
        driver.__v = undefined;
        driver.location = undefined;

        res.status(201).json({
            code: '1',
            message: req.t('profile'),
            token,
            driver,
        });

    } catch (error) {
        if (req.file) deleteFile(req.file.path);
        if (error.name === 'JsonWebTokenError') return next(createError.BadRequest('token.invalid'));
        if (error.name === 'TokenExpiredError') return next(createError.BadRequest('token.expired'));
        next(error);
    }
};

// GET /api/driver/get_categories — "List your car as" screen (dynamic, admin managed)
exports.getCategories = async (req, res, next) => {
    try {
        const cats = await getActiveCategories();
        const categories = cats.map(c => {
            const m = multilingual(c, req);
            return {
                _id: c.id,
                key: c.key, // send this as `useFor` to /select_category
                name: m.name,
                image: c.image || null,
                group: c.group, // ride | rental | others
                typeFor: c.typeFor,
            };
        });

        res.json({ code: '1', message: req.t('success'), data: { categories } });
    } catch (error) {
        next(error);
    }
};

const getDriverCategoryFromToken = async (req) => {
    try {
        const token = req.headers.token;
        if (!token) return null;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const driver = await Driver.findById(decoded._id).select('useFor');
        return driver?.useFor || null;
    } catch (e) {
        return null;
    }
};

// GET /api/driver/get_vehicle_types?useFor=rental
// Without useFor -> all types (old behaviour). With useFor -> only the types of that category.
// exports.getVehicleTypes = async (req, res, next) => {
//     try {
//         const useFor = req.query.useFor || req.query.category;
//         const filter = {};

//         if (useFor) {
//             const cat = await findActiveCategory(useFor);
//             if (!cat) return next(createError.BadRequest('Invalid category.'));
//             filter.typeFor = cat.typeFor;
//         }

//         let types = await Type.find(filter).select('-__v -typeFor -distanceRate');

//         // Rental: if admin has not created any "Rental" vehicle type yet, fall back
//         // to Taxi types so the screen is never empty.
//         if (useFor && types.length === 0 && filter.typeFor === 'Rental') {
//             types = await Type.find({ typeFor: 'Taxi' }).select('-__v -typeFor -distanceRate');
//         }

//         types = types.map(type => multilingual(type, req));

//         res.json({ code: '1', message: req.t('success'), data: { types } });
//     } catch (error) {
//         next(error);
//     }
// };
exports.getVehicleTypes = async (req, res, next) => {
    try {
        const useFor =
            req.query.useFor || req.query.category || (await getDriverCategoryFromToken(req));
        const filter = {};

        if (useFor) {
            const cat = await findActiveCategory(useFor);
            if (!cat) return next(createError.BadRequest('Invalid category.'));
            filter.typeFor = cat.typeFor;
        }

        let types = await Type.find(filter).select('-__v -typeFor -distanceRate');

        // Rental: admin ne abhi tak "Rental" vehicle type nahi banaya to Taxi types dikhao,
        // taaki screen khali na rahe.
        if (useFor && types.length === 0 && filter.typeFor === 'Rental') {
            types = await Type.find({ typeFor: 'Taxi' }).select('-__v -typeFor -distanceRate');
        }

        types = types.map((type) => multilingual(type, req));

        res.json({ code: '1', message: req.t('success'), data: { types } });
    } catch (error) {
        next(error);
    }
};

// exports.selectVehicleType = async (req, res, next) => {
//     try {
//         const type = await Type.findById(req.body.type);
//         if (!type)
//             return next(createError.BadRequest('Invalid vehicle type id.'));

//         let driver = await Driver.findByIdAndUpdate(
//             req.driver.id,
//             { type: req.body.type },
//             { new: true }
//         ).populate('city country');

//         driver = multilingualUser(driver, req);

//         if (driver.location.coordinates) {
//             driver.latitude = driver.location.coordinates[1];
//             driver.longitude = driver.location.coordinates[0];
//         }

//         // Hide fields
//         driver.location = undefined;
//         driver.__v = undefined;

//         res.json({ code: '1', message: req.t('success'), driver });
//     } catch (error) {
//         next(error);
//     }
// };

exports.selectVehicleType = async (req, res, next) => {
    try {
        const type = await Type.findById(req.body.type);
        if (!type)
            return next(createError.BadRequest('Invalid vehicle type id.'));

        // ✅ Category check
        const cat = await findActiveCategory(req.driver.useFor);
        if (cat) {
            const allowed = [cat.typeFor];
            if (cat.typeFor === 'Rental') allowed.push('Taxi'); // Rental fallback
            if (!allowed.includes(type.typeFor))
                return next(
                    createError.BadRequest('This vehicle type is not available for your category.')
                );
        }

        let driver = await Driver.findByIdAndUpdate(
            req.driver.id,
            { type: req.body.type },
            { new: true }
        ).populate('city country');

        driver = multilingualUser(driver, req);

        if (driver.location.coordinates) {
            driver.latitude = driver.location.coordinates[1];
            driver.longitude = driver.location.coordinates[0];
        }

        // Hide fields
        driver.location = undefined;
        driver.__v = undefined;

        res.json({ code: '1', message: req.t('success'), driver });
    } catch (error) {
        next(error);
    }
};

// ✅ "List your car as" screen — sets the driver's service category
// (taxi / bike / rental / courier) as a dedicated step, separate from
// create_profile. Called right after registration, before vehicle type
// selection.
exports.selectCategory = async (req, res, next) => {
    try {
        const category = await findActiveCategory(req.body.useFor);

        if (!category) {
            const allowed = (await getActiveCategories()).map(c => c.key);
            return next(
                createError.BadRequest(`useFor must be one of: ${allowed.join(', ')}`)
            );
        }

        // Rental (and any non taxi/bike category) is kept apart from ride
        // requests: ride notifications only go to useFor 'taxi' / 'bike'.
        let driver = await Driver.findByIdAndUpdate(
            req.driver.id,
            { useFor: category.key },
            { new: true }
        ).populate('city country');

        driver = multilingualUser(driver, req);

        if (driver.location?.coordinates) {
            driver.latitude = driver.location.coordinates[1];
            driver.longitude = driver.location.coordinates[0];
        }

        driver.location = undefined;
        driver.__v = undefined;

        res.json({ code: '1', message: req.t('success'), driver });
    } catch (error) {
        next(error);
    }
};

exports.getDocs = async (req, res, next) => {
    try {
        const driver = req.driver;

        // Rental flow uploads the RC on the car (POST /api/driver/car), not on the
        // driver profile — so fall back to the latest car RC and keep driver.rc in sync.
        let rc = driver.rc;
        if (!rc) {
            const car = await Car.findOne({
                driver: driver._id,
                isDeleted: false,
                rc: { $exists: true, $nin: [null, ''] },
            })
                .sort('-_id')
                .select('rc');
            if (car?.rc) {
                rc = car.rc;
                await Driver.updateOne({ _id: driver._id }, { rc });
            }
        }

        const docs = { profile: driver.profile, licence: driver.licence, pan: driver.pan, rc };
        const obj = { profile: 1, licence: 1, pan: 1, rc: 1 };

        if (!docs.profile) {
            obj.profile = 0;
            obj.licence = docs.licence ? 1 : 2;
            obj.pan = docs.pan ? 1 : 2;
            obj.rc = docs.rc ? 1 : 2;
        } else if (!docs.licence) {
            obj.licence = 0;
            obj.pan = docs.pan ? 1 : 2;
            obj.rc = docs.rc ? 1 : 2;
        } else if (!docs.pan) {
            obj.pan = 0;
            obj.rc = docs.rc ? 1 : 2;
        } else if (!docs.rc) {
            obj.rc = 0;
        }

        const data = Object.entries(obj).map(([title, status]) => ({
            title,
            status,
            url: docs[title],
        }));

        res.json({ code: '1', message: req.t('success'), data });
    } catch (error) {
        next(error);
    }
};


exports.uploadProfile = async (req, res, next) => {
    try {
        if (!req.file) return next(createError.BadRequest('Please upload file.'));

        if (req.driver.profile) deleteFile(`public${req.driver.profile}`);
        const profile = `/uploads/${req.file.filename}`;

        let driver = await Driver.findByIdAndUpdate(
            req.driver.id,
            { profile },
            { new: true }
        ).populate('city country');

        driver = multilingualUser(driver, req);
        if (driver.location?.coordinates) {
            driver.latitude = driver.location.coordinates[1];
            driver.longitude = driver.location.coordinates[0];
        }

        driver.location = undefined;
        driver.__v = undefined;

        res.json({ code: '1', message: req.t('success'), driver });
    } catch (error) {
        if (req.file) deleteFile(req.file.path);
        next(error);
    }
};


exports.uploadLicence = async (req, res, next) => {
    try {
        if (!req.file) return next(createError.BadRequest('Please upload file.'));

        if (req.driver.licence) deleteFile(`public${req.driver.licence}`);
        const licence = `/uploads/${req.file.filename}`;

        let driver = await Driver.findByIdAndUpdate(
            req.driver.id,
            { licence },
            { new: true }
        ).populate('city country');

        driver = multilingualUser(driver, req);
        if (driver.location?.coordinates) {
            driver.latitude = driver.location.coordinates[1];
            driver.longitude = driver.location.coordinates[0];
        }

        driver.location = undefined;
        driver.__v = undefined;

        res.json({ code: '1', message: req.t('success'), driver });
    } catch (error) {
        if (req.file) deleteFile(req.file.path);
        next(error);
    }
};


exports.uploadPAN = async (req, res, next) => {
    try {
        if (!req.file) return next(createError.BadRequest('Please upload file.'));

        if (req.driver.pan) deleteFile(`public${req.driver.pan}`);
        const pan = `/uploads/${req.file.filename}`;

        let driver = await Driver.findByIdAndUpdate(
            req.driver.id,
            { pan },
            { new: true }
        ).populate('city country');

        driver = multilingualUser(driver, req);
        if (driver.location?.coordinates) {
            driver.latitude = driver.location.coordinates[1];
            driver.longitude = driver.location.coordinates[0];
        }

        driver.location = undefined;
        driver.__v = undefined;

        res.json({ code: '1', message: req.t('success'), driver });
    } catch (error) {
        if (req.file) deleteFile(req.file.path);
        next(error);
    }
};


exports.uploadRC = async (req, res, next) => {
    try {
        if (!req.file) return next(createError.BadRequest('Please upload file.'));

        if (req.driver.rc) deleteFile(`public${req.driver.rc}`);
        const rc = `/uploads/${req.file.filename}`;

        let driver = await Driver.findByIdAndUpdate(
            req.driver.id,
            { rc },
            { new: true }
        ).populate('city country');

        driver = multilingualUser(driver, req);
        if (driver.location?.coordinates) {
            driver.latitude = driver.location.coordinates[1];
            driver.longitude = driver.location.coordinates[0];
        }

        driver.location = undefined;
        driver.__v = undefined;

        res.json({ code: '1', message: req.t('success'), driver });
    } catch (error) {
        if (req.file) deleteFile(req.file.path);
        next(error);
    }
};


// ==================== BIOMETRIC LOGIN ====================

// POST /driver/enable_biometric (protected — checkDriver)
// Called once, right after a normal OTP/social login, when the driver turns
// on "Login with Fingerprint/Face" in app settings. Generates a random
// secret, stores only its bcrypt hash in DB, and returns the RAW secret to
// the app — the app must store this raw value in the device's secure
// keystore (behind the OS biometric prompt), never in plain preferences.
exports.enableBiometric = async (req, res, next) => {
    try {
        const rawToken = crypto.randomBytes(32).toString('hex');
        // Deterministic hash so we can look it up later without driverId
        const hashedToken = crypto
            .createHash('sha256')
            .update(rawToken)
            .digest('hex');

        await Driver.findByIdAndUpdate(req.driver.id, {
            biometricEnabled: true,
            biometricToken: hashedToken,
        });

        res.json({
            code: '1',
            message: req.t('success'),
            data: {
                biometricToken: rawToken, // ⚠️ only once — store in device keystore
            },
        });
    } catch (error) {
        next(error);
    }
};

// POST /driver/disable_biometric (protected — checkDriver)
exports.disableBiometric = async (req, res, next) => {
    try {
        await Driver.findByIdAndUpdate(req.driver.id, {
            biometricEnabled: false,
            $unset: { biometricToken: 1 },
        });

        res.json({ code: '1', message: req.t('success') });
    } catch (error) {
        next(error);
    }
};

// POST /driver/biometric_login (public — no token header, this IS the login)
// Body: { driverId, biometricToken, fcmToken }
exports.biometricLogin = async (req, res, next) => {
    try {
        const { biometricToken, fcmToken } = req.body;

        if (!biometricToken) {
            return next(createError.BadRequest('biometricToken is required.'));
        }

        const hashedToken = crypto
            .createHash('sha256')
            .update(biometricToken)
            .digest('hex');

        let driver = await Driver.findOne({
            biometricToken: hashedToken,
            biometricEnabled: true,
        })
            .select('+biometricToken +blocked +isDeleted')
            .populate('city country');

        if (!driver) {
            return next(createError.Unauthorized('Invalid biometric credentials.'));
        }
        if (driver.blocked) {
            return next(createError.Unauthorized('auth.blocked'));
        }
        if (driver.isDeleted) {
            return next(createError.Unauthorized('auth.deleted'));
        }

        driver.isHandlingRequest = false;
        if (fcmToken) driver.fcmToken = fcmToken;
        await driver.save();

        const token = await driver.generateAuthToken();
        driver = multilingualUser(driver, req);

        if (driver.location?.coordinates) {
            driver.latitude = driver.location.coordinates[1];
            driver.longitude = driver.location.coordinates[0];
        }

        driver.location = undefined;
        driver.__v = undefined;
        driver.biometricToken = undefined;

        res.json({
            code: '1',
            message: req.t('loggedIn'),
            token,
            driver,
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/driver/register   (Personal Information screen)
// form-data: name, email, address, ssn, country_code (optional), phone (optional), fcmToken (optional)
// files: licence_front, licence_back, profile (optional)
// exports.registerDriver = async (req, res, next) => {
//     const files = req.files || {};
//     const allFiles = Object.values(files).flat();
//     const url = name => (files[name]?.[0] ? `/uploads/${files[name][0].filename}` : undefined);

//     try {
//         const name = String(req.body.name || '').trim();
//         const email = String(req.body.email || '').trim().toLowerCase();
//         const country_code = String(req.body.country_code || '').trim();
//         const phone = String(req.body.phone || '').replace(/\D/g, '');
//         const address = String(req.body.address || '').trim();

//         // ---------- Validation ----------
//         if (!name) return next(createError.BadRequest('Full name is required.'));
//         if (!email) return next(createError.BadRequest('Email address is required.'));
//         if (!validator.isEmail(email)) return next(createError.BadRequest('Invalid email address.'));
//         if (!address) return next(createError.BadRequest('Address is required.'));

//         // country_code & phone optional, lekin phone diya ho to valid hona chahiye
//         if (phone && (phone.length < 6 || phone.length > 15)) {
//             return next(createError.BadRequest('Invalid phone number.'));
//         }

//         const licenceFront = url('licence_front');
//         const licenceBack = url('licence_back');
//         if (!licenceFront || !licenceBack) {
//             return next(createError.BadRequest('Driving license front and back images are required.'));
//         }

//         // SSN: validate + bcrypt hash (raw SSN kabhi save/return nahi hota)
//         const ssn = normalizeSSN(req.body.ssn);
//         const ssnHash = await hashSSN(ssn);

//         // ---------- Duplicate check (phone sirf tab, jab diya ho) ----------
//         const orConditions = [{ email }];
//         if (phone) orConditions.push({ phone });

//         const existing = await Driver.findOne({ $or: orConditions }).select('phone email');
//         if (existing) {
//             const field = existing.email === email ? 'email' : 'phone number';
//             return next(createError.Conflict(`This ${field} is already registered. Please login instead.`));
//         }

//         // ---------- Create (khali phone/country_code set hi nahi karte) ----------
//         const data = {
//             name,
//             email,
//             address,
//             profile: url('profile'),
//             licence: licenceFront,
//             licenceBack,
//             ssnHash,
//             ssnLast4: ssn.slice(-4),
//             applicationStatus: 'incomplete', // vehicle info baaki he
//             fcmToken: req.body.fcmToken || undefined,
//         };
//         if (phone) {
//             data.phone = phone;
//             if (country_code) data.country_code = country_code;
//         }

//         let driver = await Driver.create(data);

//         const token = await driver.generateAuthToken();

//         const application = buildApplicationInfo(driver);
//         driver = multilingualUser(driver, req);

//         driver.password = undefined;
//         driver.__v = undefined;
//         driver.location = undefined;
//         driver.ssnHash = undefined;
//         driver.application = application;

//         res.status(201).json({
//             code: '1',
//             message: req.t('profile'),
//             token, // aage ke har API ke header `token` me jayega
//             driver,
//         });
//     } catch (error) {
//         allFiles.forEach(f => deleteFile(f.path));

//         if (error.code === 11000) {
//             console.error('[register] duplicate key:', error.keyValue);

//             const field = Object.keys(error.keyPattern || {})[0] || 'details';

//             // Phone diya hi nahi aur phir bhi phone duplicate aaya: ye DB index ki dikkat he
//             if (field === 'phone' && !req.body.phone) {
//                 return next(
//                     createError.InternalServerError(
//                         'Server index issue on phone. Please run the phone index fix script.'
//                     )
//                 );
//             }
//             return next(createError.Conflict(`This ${field} is already registered. Please login instead.`));
//         }
//         next(error);
//     }
// };

exports.registerDriver = async (req, res, next) => {
    const files = req.files || {};
    const allFiles = Object.values(files).flat();
    const url = name => (files[name]?.[0] ? `/uploads/${files[name][0].filename}` : undefined);
    const fail = (err) => {
        allFiles.forEach(f => deleteFile(f.path));
        return next(err);
    };

    try {
        // ---------- Token (body ko priority, phir header) ----------
        const verifyToken = req.body.verifyToken || req.body.token || req.headers.token;
        if (!verifyToken) {
            return fail(createError.BadRequest('verifyToken is missing. Call verify_otp first.'));
        }

        const decoded = await promisify(jwt.verify)(verifyToken, process.env.JWT_SECRET);
        console.log('REGISTER decoded:', decoded);

        if (decoded._id) {
            return fail(createError.BadRequest(
                'You sent a LOGIN token. This number is already registered, please login instead.'
            ));
        }
        if (decoded.purpose !== 'register' || !decoded.phone) {
            return fail(createError.BadRequest(
                `Invalid verifyToken (payload keys: ${Object.keys(decoded).join(', ')}).`
            ));
        }

        const { country_code, phone } = decoded;

        // ---------- Body ----------
        const name = String(req.body.name || '').trim();
        const email = String(req.body.email || '').trim().toLowerCase();
        const address = String(req.body.address || '').trim();

        if (!name) return fail(createError.BadRequest('Full name is required.'));
        if (!email) return fail(createError.BadRequest('Email address is required.'));
        if (!validator.isEmail(email)) return fail(createError.BadRequest('Invalid email address.'));
        if (!address) return fail(createError.BadRequest('Address is required.'));

        const licenceFront = url('licence_front');
        const licenceBack = url('licence_back');
        if (!licenceFront || !licenceBack) {
            return fail(createError.BadRequest('Driving license front and back images are required.'));
        }

        const ssn = normalizeSSN(req.body.ssn);
        const ssnHash = await hashSSN(ssn);

        // ---------- Duplicate ----------
        const existing = await Driver.findOne({ $or: [{ email }, { phone }] }).select('phone email');
        if (existing) {
            const field = existing.email === email ? 'email' : 'phone number';
            return fail(createError.Conflict(`This ${field} is already registered. Please login instead.`));
        }

        // ---------- Create ----------
        let driver = await Driver.create({
            name,
            email,
            country_code,
            phone,
            address,
            profile: url('profile'),
            licence: licenceFront,
            licenceBack,
            ssnHash,
            ssnLast4: ssn.slice(-4),
            applicationStatus: 'incomplete',
            fcmToken: req.body.fcmToken || undefined,
        });

        const token = await driver.generateAuthToken();
        const application = buildApplicationInfo(driver);
        driver = multilingualUser(driver, req);

        driver.password = undefined;
        driver.__v = undefined;
        driver.location = undefined;
        driver.ssnHash = undefined;
        driver.application = application;

        res.status(201).json({
            code: '1',
            message: req.t('profile'),
            token,
            driver,
        });
    } catch (error) {
        allFiles.forEach(f => deleteFile(f.path));

        if (error.name === 'JsonWebTokenError') return next(createError.BadRequest('token.invalid'));
        if (error.name === 'TokenExpiredError') return next(createError.BadRequest('token.expired'));

        if (error.code === 11000) {
            console.error('[register] duplicate key:', error.keyValue);
            const field = Object.keys(error.keyPattern || {})[0] || 'details';
            return next(createError.Conflict(`This ${field} is already registered. Please login instead.`));
        }
        next(error);
    }
};

// POST /api/driver/vehicle_info   (Vehicle Information screen)
// form-data: type (vehicle type id), plate_number, files: insurance, vehicle_photo
exports.submitVehicleInfo = async (req, res, next) => {
    // console.log('====== vehicle_info DEBUG ======');
    // console.log('req.files:', req.files);
    // console.log('req.body:', req.body);
    // console.log('================================');
    const files = req.files || {};
    const allFiles = Object.values(files).flat();
    const url = name => (files[name]?.[0] ? `/uploads/${files[name][0].filename}` : undefined);

    try {
        const current = req.driver;
        const status = getApplicationStatus(current);

        if (status === 'approved')
            return next(createError.BadRequest('Your application is already approved.'));
        if (status === 'rejected')
            return next(createError.BadRequest('Your application was rejected. Please contact support.'));
        if (status === 'resubmission_required')
            return next(createError.BadRequest('Please use resubmit_document to update the requested documents.'));
        if (!isPersonalComplete(current))
            return next(createError.BadRequest('Please complete personal information first.'));

        // Vehicle type
        const type = await Type.findById(req.body.type);
        if (!type) return next(createError.BadRequest('Invalid vehicle type id.'));

        const cat = await findActiveCategory(current.useFor);
        if (cat) {
            const allowed = [cat.typeFor];
            if (cat.typeFor === 'Rental') allowed.push('Taxi'); // Rental fallback (select_vehicle_type jaisa)
            if (!allowed.includes(type.typeFor))
                return next(createError.BadRequest('This vehicle type is not available for your category.'));
        }

        // Plate number
        const plateNumber = String(req.body.plate_number || '').trim().toUpperCase();
        if (!plateNumber) return next(createError.BadRequest('Vehicle license plate number is required.'));
        if (!/^[A-Z0-9][A-Z0-9\- ]{1,14}$/.test(plateNumber))
            return next(createError.BadRequest('Invalid plate number.'));

        // Files: nayi bheji to wahi, warna pehle wali chalegi
        const insurance = url('insurance') || current.insurance;
        const vehiclePhoto = url('vehicle_photo') || current.vehiclePhoto;
        if (!insurance) return next(createError.BadRequest('Vehicle insurance document is required.'));
        if (!vehiclePhoto) return next(createError.BadRequest('Vehicle photo is required.'));

        const update = {
            type: type.id,
            plateNumber,
            insurance,
            vehiclePhoto,
            applicationStatus: 'under_review',
        };
        if (status !== 'under_review') update.applicationSubmittedAt = new Date();

        let driver = await Driver.findByIdAndUpdate(current.id, update, { new: true }).populate(
            'city country'
        );

        // Replace hui purani files hata do
        if (url('insurance') && current.insurance) deleteFile(`public${current.insurance}`);
        if (url('vehicle_photo') && current.vehiclePhoto) deleteFile(`public${current.vehiclePhoto}`);

        const application = buildApplicationInfo(driver);
        driver = multilingualUser(driver, req);

        if (driver.location?.coordinates) {
            driver.latitude = driver.location.coordinates[1];
            driver.longitude = driver.location.coordinates[0];
        }
        driver.location = undefined;
        driver.__v = undefined;
        driver.application = application;

        res.json({ code: '1', message: req.t('success'), driver });
    } catch (error) {
        allFiles.forEach(f => deleteFile(f.path));
        if (error.name === 'CastError') return next(createError.BadRequest('Invalid vehicle type id.'));
        next(error);
    }
};

// GET /api/driver/application_status   (Application Status screen)
exports.getApplicationStatus = async (req, res, next) => {
    try {
        const driver = req.driver;
        const { steps, card } = buildStatusScreen(driver);

        res.json({
            code: '1',
            message: req.t('success'),
            data: {
                ...buildApplicationInfo(driver),
                steps,
                card,
            },
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/driver/resubmit_document   ("Resubmit Document" button)
// files: licence_front, licence_back, insurance, vehicle_photo (sirf jo admin ne maange)
exports.resubmitDocument = async (req, res, next) => {
    const files = req.files || {};
    const allFiles = Object.values(files).flat();

    try {
        const current = req.driver;

        if (getApplicationStatus(current) !== 'resubmission_required') {
            return next(createError.BadRequest('No document resubmission is requested for your application.'));
        }

        const requested = current.resubmission?.documents || [];
        const provided = requested.filter(key => files[key]?.[0]);
        const missing = requested.filter(key => !files[key]?.[0]);

        if (missing.length) {
            return next(
                createError.BadRequest(`Please upload: ${missing.map(k => DOC_LABELS[k] || k).join(', ')}`)
            );
        }

        const update = {
            applicationStatus: 'under_review',
            applicationSubmittedAt: new Date(),
            $unset: { resubmission: 1 },
        };
        const oldFiles = [];

        provided.forEach(key => {
            const field = DOC_FIELD_MAP[key];
            if (current[field]) oldFiles.push(current[field]);
            update[field] = `/uploads/${files[key][0].filename}`;
        });

        // Jo documents maange nahi gaye unki upload hui files hata do
        Object.keys(files).forEach(key => {
            if (!requested.includes(key)) files[key].forEach(f => deleteFile(f.path));
        });

        let driver = await Driver.findByIdAndUpdate(current.id, update, { new: true }).populate(
            'city country'
        );

        oldFiles.forEach(p => deleteFile(`public${p}`));

        const application = buildApplicationInfo(driver);
        driver = multilingualUser(driver, req);
        driver.location = undefined;
        driver.__v = undefined;
        driver.application = application;

        res.json({
            code: '1',
            message: req.t('success'),
            // "Resubmission confirmation" popup
            confirmation: {
                title: 'Resubmission confirmation',
                message:
                    'Your application has been submitted successfully. Our team will review your details and notify you once a decision is made.',
                buttonText: 'View Application Status',
                action: 'application_status',
            },
            driver,
        });
    } catch (error) {
        allFiles.forEach(f => deleteFile(f.path));
        next(error);
    }
};

// GET /api/driver/contact_subjects   (Subject dropdown)
exports.getContactSubjects = async (req, res, next) => {
    try {
        res.json({ code: '1', message: req.t('success'), data: { subjects: CONTACT_SUBJECTS } });
    } catch (error) {
        next(error);
    }
};

// POST /api/driver/contact_us   (Contact Us screen)
// body: name, subject, message, customSubject (subject = "Other" ho tab)
exports.contactUs = async (req, res, next) => {
    try {
        const name = String(req.body.name || '').trim();
        const subject = String(req.body.subject || '').trim();
        const customSubject = String(req.body.customSubject || '').trim();
        const message = String(req.body.message || '').trim();

        if (!name) return next(createError.BadRequest('Name is required.'));
        if (!subject) return next(createError.BadRequest('Subject is required.'));
        if (!CONTACT_SUBJECTS.includes(subject))
            return next(createError.BadRequest(`subject must be one of: ${CONTACT_SUBJECTS.join(', ')}`));
        if (subject === 'Other' && !customSubject)
            return next(createError.BadRequest('Please specify your subject.'));
        if (!message) return next(createError.BadRequest('Message is required.'));
        if (message.length > 2000)
            return next(createError.BadRequest('Message is too long (max 2000 characters).'));

        await SupportMessage.create({
            driver: req.driver.id,
            name,
            subject,
            customSubject: subject === 'Other' ? customSubject : undefined,
            message,
            applicationStatus: getApplicationStatus(req.driver),
        });

        res.json({
            code: '1',
            message: req.t('success'),
            // "Message Submitted" popup
            confirmation: {
                title: 'Message Submitted',
                message: "Our support team has received your message. We'll get back to you as soon as possible.",
                buttonText: 'Back to application status',
                action: 'application_status',
            },
        });
    } catch (error) {
        next(error);
    }
};