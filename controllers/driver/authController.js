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
// const validator = require('validator');
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
        const mobile = country_code + phone;

        // verify otp
        const otpVerified = await OTP.findOne({ mobile, otp });
        if (!otpVerified) return next(createError.BadRequest('otp.fail'));

        // if driver exists, login else send verifyToken
        let driver = await Driver.findOne({ phone })
            .select('-__v')
            .populate('city country');

        if (driver) {
            // if (!req.body.fcmToken)
            //     return next(createError.BadRequest('fcmToken is required.'));

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
            driver.location = undefined;

            return res.json({
                code: '1',
                message: req.t('loggedIn'),
                token,
                driver,
            });
        }

        // generate verifyToken
        const verifyToken = jwt.sign(
            { country_code, phone },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            code: '001',
            message: req.t('otp.verified'),
            verifyToken,
            country_code,
            phone,
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