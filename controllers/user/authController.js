// const { promisify } = require('util');
// const createError = require('http-errors');
// // const validator = require('validator');
// const jwt = require('jsonwebtoken');
// const multilingualUser = require('../../utils/multilingualUser');
// const generateCode = require('../../utils/generateCode');
// // const { sendOTP } = require('../../utils/sendSMS');
// const deleteFile = require('../../utils/deleteFile');

// const User = require('../../models/userModel');
// const OTP = require('../../models/otpModel');
// const Address = require('../../models/addressModel');
// const City = require('../../models/cityModel');
// const Country = require('../../models/countryModel');
// const { sendOTP } = require("../../utils/sendSMS")

// exports.checkUser = async (req, res, next) => {
//     try {
//         const token = req.headers.token;

//         if (!token) return next(createError.BadRequest('auth.provideToken'));

//         const decoded = jwt.verify(token, process.env.JWT_SECRET);

//         let user = await User.findById(decoded._id).select(
//             '+blocked +password'
//         );

//         if (!user) return next(createError.BadRequest('auth.login'));
//         if (user.blocked) return next(createError.Unauthorized('auth.blocked'));

//         req.user = user;
//         next();
//     } catch (error) {
//         next(error);
//     }
// };

// exports.sendOTP = async (req, res, next) => {
//     try {
//         const { country_code, phone } = req.body;

//         // validate mobile
//         if (!country_code)
//             return next(createError.BadRequest('validation.country_code'));
//         if (!phone) return next(createError.BadRequest('validation.phone'));

//         const mobile = country_code + phone;
//         // if (!validator.isMobilePhone(mobile, 'any'))
//         //     return next(createError.BadRequest('validation.mobileInvalid'));

//         // generate and save OTP
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

// // exports.sendOTP = async (req, res, next) => {
// //     try {
// //         const { country_code, phone } = req.body;

// //         if (!country_code)
// //             return next(createError.BadRequest('validation.country_code'));
// //         if (!phone) 
// //             return next(createError.BadRequest('validation.phone'));

// //         const mobile = country_code + phone;

// //         // Generate and save OTP
// //         const otp = generateCode(4);
// //         await OTP.updateOne(
// //             { mobile },
// //             { otp, expireAt: Date.now() + 2 * 60 * 1000 },
// //             { upsert: true }
// //         );

// //         // Send OTP via SMS provider (Twilio)
// //         try {
// //             await sendOTP(mobile, otp);
// //         } catch (smsError) {
// //             console.error('SMS Provider Error:', smsError);
// //             // OTP is saved in DB, but SMS failed
// //             return next(createError.InternalServerError('otp.sendFailed'));
// //         }

// //         res.json({
// //             code: '1',
// //             message: req.t('otp.sent'),
// //             result: {
// //                 country_code,
// //                 phone,
// //                 // Only include OTP in development/testing
// //                 ...(process.env.NODE_ENV !== 'production' && { otp })
// //             },
// //         });
// //     } catch (error) {
// //         next(error);
// //     }
// // };

// exports.verifyOTP = async (req, res, next) => {
//     try {
//         const { country_code, phone, otp } = req.body;
//         const mobile = country_code + phone;

//         // verify otp
//         const otpVerified = await OTP.findOne({ mobile, otp });
//         if (!otpVerified) return next(createError.BadRequest('otp.fail'));

//         // if userExists, login else send verifyToken
//         const userExists = await User.findOne({ country_code, phone }).select(
//             '-__v'
//         );
//         if (userExists) {
//             userExists.fcmToken = req.body.fcmToken;
//             await userExists.save();
//             const token = await userExists.generateAuthToken();
//             return res.json({
//                 code: '1',
//                 message: req.t('loggedIn'),
//                 token,
//                 user: userExists,
//             });
//         }

//         // generate verifyToken
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
// //         const decoded = await promisify(jwt.verify)(
// //             req.body.verifyToken,
// //             process.env.JWT_SECRET
// //         );
// //         if (!decoded.phone) return next(createError.BadRequest('phone.verify'));

// //         const { city_id, country_id } = req.body;
// //         const [city, country] = await Promise.all([
// //             City.findOne({ city_id }),
// //             Country.findOne({ country_id }),
// //         ]);

// //         // 1. Handle file uploads
// //         const profile = req.files?.profile?.[0] ? `/uploads/${req.files.profile[0].filename}` : undefined;
// //         const licenseFront = req.files?.licenseFront?.[0] ? `/uploads/${req.files.licenseFront[0].filename}` : undefined;
// //         const licenseBack = req.files?.licenseBack?.[0] ? `/uploads/${req.files.licenseBack[0].filename}` : undefined;

// //         // 2. Create user
// //         let user = new User({
// //             name: req.body.name,
// //             email: req.body.email,
// //             country_code: decoded.country_code,
// //             phone: decoded.phone,
// //             city: city?.id,
// //             country: country?.id,
// //             profile,
// //             licenseFront,
// //             licenseBack,
// //             fcmToken: req.body.fcmToken,
// //         });

// //         // 3. Create address
// //         const address = new Address({
// //             userId: user.id,
// //             address: req.body.address,
// //             latitude: req.body.latitude,
// //             longitude: req.body.longitude,
// //             selected: true,
// //         });

// //         // 4. Validate
// //         await user.validate();
// //         await address.validate();

// //         user.address = address.id;
// //         await Promise.all([user.save(), address.save()]);

// //         const token = await user.generateAuthToken();
// //         await user.populate('city country address');
// //         user = multilingualUser(user, req);

// //         user.latitude = user.address.latitude;
// //         user.longitude = user.address.longitude;
// //         user.address = user.address.address;

// //         // Hide fields
// //         user.password = undefined;
// //         user.__v = undefined;

// //         res.status(201).json({
// //             code: '1',
// //             message: req.t('profile'),
// //             token,
// //             user,
// //         });

// //     } catch (error) {
// //         // 5. Delete uploaded files on error
// //         const files = [
// //             req.files?.profile?.[0],
// //             req.files?.licenseFront?.[0],
// //             req.files?.licenseBack?.[0]
// //         ].filter(Boolean);
// //         files.forEach(file => deleteFile(file.path));

// //         if (error.name === 'JsonWebTokenError')
// //             return next(createError.BadRequest('token.invalid'));
// //         if (error.name === 'TokenExpiredError')
// //             return next(createError.BadRequest('token.expired'));

// //         next(error);
// //     }
// // };

// exports.createProfile = async (req, res, next) => {
//     try {
//         // 1. Verify Token
//         const decoded = await promisify(jwt.verify)(
//             req.body.verifyToken,
//             process.env.JWT_SECRET
//         );
//         if (!decoded.phone) return next(createError.BadRequest('phone.verify'));

//         // 2. Extract fields (API ke hisaab se)
//         const {
//             name,
//             email,
//             address: addressText,
//             city: city_id,          // form-data se "city" aayega
//             country: country_id,    // form-data se "country" aayega
//             referralCode,
//             lat,
//             lng,
//             fcmToken,
//         } = req.body;

//         // 3. Find city & country
//         const [city, country] = await Promise.all([
//             City.findOne({ city_id }),
//             Country.findOne({ country_id }),
//         ]);

//         if (!city || !country) {
//             return next(createError.BadRequest('Invalid city or country'));
//         }

//         // 4. Handle file uploads
//         const profile = req.files?.profile?.[0]
//             ? `/uploads/${req.files.profile[0].filename}`
//             : undefined;
//         const licenseFront = req.files?.licenseFront?.[0]
//             ? `/uploads/${req.files.licenseFront[0].filename}`
//             : undefined;
//         const licenseBack = req.files?.licenseBack?.[0]
//             ? `/uploads/${req.files.licenseBack[0].filename}`
//             : undefined;

//         // 5. Create user
//         let user = new User({
//             name,
//             email,
//             country_code: decoded.country_code,
//             phone: decoded.phone,
//             city: city?.id,
//             country: country?.id,
//             referralCode: referralCode || undefined,   // optional
//             profile,
//             licenseFront,
//             licenseBack,
//             fcmToken,
//         });

//         // 6. Create address
//         const address = new Address({
//             userId: user.id,
//             address: addressText,
//             latitude: lat || req.body.latitude,
//             longitude: lng || req.body.longitude,
//             latitude: lat,
//             longitude: lng,
//             selected: true,
//         });

//         // 7. Validate
//         await user.validate();
//         await address.validate();

//         // 8. Link address & save
//         user.address = address.id;
//         await Promise.all([user.save(), address.save()]);

//         // 9. Generate token & populate
//         const token = await user.generateAuthToken();
//         await user.populate('city country address');
//         user = multilingualUser(user, req);

//         // Flatten address for response
//         user.latitude = user.address?.latitude;
//         user.longitude = user.address?.longitude;
//         user.address = user.address?.address;

//         // Hide sensitive fields
//         user.password = undefined;
//         user.__v = undefined;

//         res.status(201).json({
//             code: '1',
//             message: req.t('profile'),
//             token,
//             user,
//         });

//     } catch (error) {
//         // Delete uploaded files on error
//         const files = [
//             req.files?.profile?.[0],
//             req.files?.licenseFront?.[0],
//             req.files?.licenseBack?.[0],
//         ].filter(Boolean);

//         files.forEach(file => deleteFile(file.path));

//         if (error.name === 'JsonWebTokenError')
//             return next(createError.BadRequest('token.invalid'));
//         if (error.name === 'TokenExpiredError')
//             return next(createError.BadRequest('token.expired'));

//         next(error);
//     }
// };

// exports.socialLogin = async (req, res, next) => {
//     try {
//         const { email, googleId, facebookId, appleId } = req.body;

//         let user = await User.findOne({ email }).populate(
//             'city country address'
//         );

//         // if user exists, redirect to create profile screen
//         if (!user) {
//             return res.json({
//                 code: '001',
//                 message: req.t('success'),
//                 user: { email, googleId, facebookId, appleId },
//             });
//         }

//         if (googleId) {
//             if (!user.googleId) {
//                 const errorMessage = user.facebookId
//                     ? 'social.facebook'
//                     : user.appleId
//                         ? 'social.apple'
//                         : 'social.phone';
//                 return next(createError.BadRequest(errorMessage));
//             }
//             if (googleId !== user.googleId) {
//                 return next(createError.BadRequest('social.invalidGoogle'));
//             }
//         }

//         if (facebookId) {
//             if (!user.facebookId) {
//                 const errorMessage = user.googleId
//                     ? 'social.google'
//                     : user.appleId
//                         ? 'social.apple'
//                         : 'social.phone';
//                 return next(createError.BadRequest(errorMessage));
//             }
//             if (facebookId !== user.facebookId) {
//                 return next(createError.BadRequest('social.invalidFacebook'));
//             }
//         }

//         if (appleId) {
//             if (!user.appleId) {
//                 const errorMessage = user.googleId
//                     ? 'social.google'
//                     : user.facebookId
//                         ? 'social.facebook'
//                         : 'social.phone';
//                 return next(createError.BadRequest(errorMessage));
//             }
//             if (appleId !== user.appleId) {
//                 return next(createError.BadRequest('social.invalidApple'));
//             }
//         }

//         user.fcmToken = req.body.fcmToken;
//         await user.save();
//         const token = await user.generateAuthToken();

//         user = multilingualUser(user, req);
//         user.latitude = user.address.latitude;
//         user.longitude = user.address.longitude;
//         user.address = user.address.address;

//         return res.json({
//             code: '1',
//             message: req.t('loggedIn'),
//             token,
//             user,
//         });
//     } catch (error) {
//         next(error);
//     }
// };

// // exports.createSocialProfile = async (req, res, next) => {
// //     try {
// //         const { city_id, country_id } = req.body;
// //         const [city, country] = await Promise.all([
// //             City.findOne({ city_id }),
// //             Country.findOne({ country_id }),
// //         ]);

// //         // 1. Handle file uploads
// //         const profile = req.files?.profile?.[0] ? `/uploads/${req.files.profile[0].filename}` : undefined;
// //         const licenseFront = req.files?.licenseFront?.[0] ? `/uploads/${req.files.licenseFront[0].filename}` : undefined;
// //         const licenseBack = req.files?.licenseBack?.[0] ? `/uploads/${req.files.licenseBack[0].filename}` : undefined;

// //         // 2. Create user
// //         let user = new User({
// //             name: req.body.name,
// //             email: req.body.email,
// //             country_code: req.body.country_code,
// //             phone: req.body.phone,
// //             city: city?.id,
// //             country: country?.id,
// //             googleId: req.body.googleId,
// //             facebookId: req.body.facebookId,
// //             appleId: req.body.appleId,
// //             profile,
// //             licenseFront,
// //             licenseBack,
// //             fcmToken: req.body.fcmToken,
// //         });

// //         // 3. Create address
// //         const address = new Address({
// //             userId: user.id,
// //             address: req.body.address,
// //             latitude: req.body.latitude,
// //             longitude: req.body.longitude,
// //             selected: true,
// //         });

// //         // 4. Validate
// //         await user.validate();
// //         await address.validate();

// //         user.address = address.id;
// //         await Promise.all([user.save(), address.save()]);

// //         const token = await user.generateAuthToken();
// //         await user.populate('city country address');
// //         user = multilingualUser(user, req);

// //         user.latitude = user.address.latitude;
// //         user.longitude = user.address.longitude;
// //         user.address = user.address.address;

// //         // Hide fields
// //         user.password = undefined;
// //         user.__v = undefined;

// //         res.status(201).json({
// //             code: '1',
// //             message: req.t('profile'),
// //             token,
// //             user,
// //         });

// //     } catch (error) {
// //         // 5. Delete uploaded files on error
// //         const files = [
// //             req.files?.profile?.[0],
// //             req.files?.licenseFront?.[0],
// //             req.files?.licenseBack?.[0]
// //         ].filter(Boolean);
// //         files.forEach(file => deleteFile(file.path));

// //         if (error.name === 'JsonWebTokenError')
// //             return next(createError.BadRequest('token.invalid'));
// //         if (error.name === 'TokenExpiredError')
// //             return next(createError.BadRequest('token.expired'));

// //         next(error);
// //     }
// // };

// exports.createSocialProfile = async (req, res, next) => {
//     try {
//         console.log('=== createSocialProfile START ===');
//         console.log('req.body:', JSON.stringify(req.body, null, 2));
//         console.log('req.files:', req.files ? Object.keys(req.files) : 'no files');

//         const { city_id, country_id } = req.body;
//         const [city, country] = await Promise.all([
//             City.findOne({ city_id }),
//             Country.findOne({ country_id }),
//         ]);

//         console.log('city found:', city ? city._id : 'NOT FOUND');
//         console.log('country found:', country ? country._id : 'NOT FOUND');

//         // 1. Handle file uploads
//         const profile = req.files?.profile?.[0]
//             ? `/uploads/${req.files.profile[0].filename}`
//             : undefined;
//         const licenseFront = req.files?.licenseFront?.[0]
//             ? `/uploads/${req.files.licenseFront[0].filename}`
//             : undefined;
//         const licenseBack = req.files?.licenseBack?.[0]
//             ? `/uploads/${req.files.licenseBack[0].filename}`
//             : undefined;

//         console.log('profile path:', profile);

//         // ✅ FIX: Empty string ko undefined karo taaki MongoDB skip kare
//         const googleId = req.body.googleId || undefined;
//         const facebookId = req.body.facebookId || undefined;
//         const appleId = req.body.appleId || undefined;

//         console.log('googleId from body:', googleId);
//         console.log('facebookId from body:', facebookId);
//         console.log('appleId from body:', appleId);

//         // 2. Create user
//         let user = new User({
//             name: req.body.name,
//             email: req.body.email,
//             country_code: req.body.country_code,
//             phone: req.body.phone,
//             city: city?.id,
//             country: country?.id,
//             googleId,    // ✅ undefined pass hoga agar empty string aayi
//             facebookId,
//             appleId,
//             profile,
//             licenseFront,
//             licenseBack,
//             fcmToken: req.body.fcmToken,
//         });

//         console.log('user object before save:', {
//             name: user.name,
//             email: user.email,
//             phone: user.phone,
//             country_code: user.country_code,
//             googleId: user.googleId,
//             facebookId: user.facebookId,
//             appleId: user.appleId,
//         });

//         // 3. Create address
//         const address = new Address({
//             userId: user.id,
//             address: req.body.address,
//             latitude: req.body.latitude,
//             longitude: req.body.longitude,
//             selected: true,
//         });

//         // 4. Validate
//         console.log('Validating user...');
//         await user.validate();
//         console.log('✅ User validation passed');

//         await address.validate();
//         console.log('✅ Address validation passed');

//         user.address = address.id;
//         await Promise.all([user.save(), address.save()]);
//         console.log('✅ User saved to DB. User _id:', user._id);

//         // ✅ DB se re-fetch karke confirm karo ki values save hui
//         const savedUser = await User.findById(user._id).select(
//             'googleId facebookId appleId email phone'
//         );
//         console.log('=== DB se re-fetched user ===');
//         console.log('savedUser.googleId:', savedUser.googleId);
//         console.log('savedUser.facebookId:', savedUser.facebookId);
//         console.log('savedUser.appleId:', savedUser.appleId);

//         const token = await user.generateAuthToken();
//         await user.populate('city country address');
//         user = multilingualUser(user, req);

//         user.latitude = user.address?.latitude;
//         user.longitude = user.address?.longitude;
//         user.address = user.address?.address;

//         user.password = undefined;
//         user.__v = undefined;

//         console.log('=== createSocialProfile SUCCESS ===');

//         res.status(201).json({
//             code: '1',
//             message: req.t('profile'),
//             token,
//             user,
//         });

//     } catch (error) {
//         console.error('=== createSocialProfile ERROR ===');
//         console.error('Error name:', error.name);
//         console.error('Error message:', error.message);

//         // ✅ Mongoose validation errors detail mein dikhao
//         if (error.name === 'ValidationError') {
//             console.error('Validation errors:');
//             Object.keys(error.errors).forEach(field => {
//                 console.error(`  ${field}: ${error.errors[field].message}`);
//             });
//         }

//         // ✅ Duplicate key error (phone/email already exists)
//         if (error.code === 11000) {
//             console.error('Duplicate key error:', error.keyValue);
//             return next(createError.Conflict(
//                 `${Object.keys(error.keyValue)[0]} already exists`
//             ));
//         }

//         // 5. Delete uploaded files on error
//         const files = [
//             req.files?.profile?.[0],
//             req.files?.licenseFront?.[0],
//             req.files?.licenseBack?.[0],
//         ].filter(Boolean);
//         files.forEach(file => {
//             console.log('Deleting file on error:', file.path);
//             deleteFile(file.path);
//         });

//         if (error.name === 'JsonWebTokenError')
//             return next(createError.BadRequest('token.invalid'));
//         if (error.name === 'TokenExpiredError')
//             return next(createError.BadRequest('token.expired'));

//         next(error);
//     }
// };

// // ======================================================
// // 1. ENABLE BIOMETRIC (Login ke baad call hoga)
// // ======================================================
// exports.enableBiometric = async (req, res, next) => {
//     try {
//         const user = req.user; // checkUser middleware se aayega
//         const { deviceId } = req.body; // optional

//         // Generate long lived biometric token
//         const biometricToken = user.generateBiometricToken();

//         user.biometricEnabled = true;
//         user.biometricToken = biometricToken;
//         if (deviceId) user.biometricDeviceId = deviceId;

//         await user.save();

//         res.json({
//             code: '1',
//             message: req.t('biometric.enabled') || 'Biometric enabled successfully',
//             biometricToken, // <-- ye client securely store karega (Keychain/Keystore)
//         });
//     } catch (error) {
//         next(error);
//     }
// };

// // ======================================================
// // 2. BIOMETRIC LOGIN
// // ======================================================
// exports.biometricLogin = async (req, res, next) => {
//     try {
//         const { biometricToken, fcmToken, deviceId } = req.body;

//         if (!biometricToken) {
//             return next(createError.BadRequest('biometric.tokenRequired'));
//         }

//         // Verify biometric token
//         let decoded;
//         try {
//             decoded = jwt.verify(biometricToken, process.env.JWT_SECRET);
//         } catch (err) {
//             return next(createError.Unauthorized('biometric.invalidToken'));
//         }

//         if (decoded.type !== 'biometric') {
//             return next(createError.Unauthorized('biometric.invalidToken'));
//         }

//         // Find user with biometricToken
//         const user = await User.findOne({
//             _id: decoded._id,
//             biometricToken,
//             biometricEnabled: true,
//         }).select('+biometricToken +biometricDeviceId +blocked');

//         if (!user) {
//             return next(createError.Unauthorized('biometric.notEnabled'));
//         }

//         if (user.blocked) {
//             return next(createError.Unauthorized('auth.blocked'));
//         }

//         // Optional: Device ID check (extra security)
//         if (deviceId && user.biometricDeviceId && user.biometricDeviceId !== deviceId) {
//             return next(createError.Unauthorized('biometric.deviceMismatch'));
//         }

//         // Update FCM token if provided
//         if (fcmToken) {
//             user.fcmToken = fcmToken;
//             await user.save();
//         }

//         // Generate normal auth token
//         const token = await user.generateAuthToken();

//         // Populate & format response
//         await user.populate('city country address');
//         let formattedUser = multilingualUser(user, req);

//         formattedUser.latitude = formattedUser.address?.latitude;
//         formattedUser.longitude = formattedUser.address?.longitude;
//         formattedUser.address = formattedUser.address?.address;

//         formattedUser.password = undefined;
//         formattedUser.__v = undefined;
//         formattedUser.biometricToken = undefined;

//         res.json({
//             code: '1',
//             message: req.t('loggedIn'),
//             token,
//             user: formattedUser,
//         });
//     } catch (error) {
//         next(error);
//     }
// };

// // ======================================================
// // 3. DISABLE BIOMETRIC
// // ======================================================
// exports.disableBiometric = async (req, res, next) => {
//     try {
//         const user = req.user;

//         user.biometricEnabled = false;
//         user.biometricToken = undefined;
//         user.biometricDeviceId = undefined;

//         await user.save();

//         res.json({
//             code: '1',
//             message: req.t('biometric.disabled') || 'Biometric disabled successfully',
//         });
//     } catch (error) {
//         next(error);
//     }
// };

const { promisify } = require('util');
const { generateUniqueReferralCode } = require('../../utils/Referralcode');
const createError = require('http-errors');
// const validator = require('validator');
const jwt = require('jsonwebtoken');
const multilingualUser = require('../../utils/multilingualUser');
const generateCode = require('../../utils/generateCode');
// const { sendOTP } = require('../../utils/sendSMS');
const deleteFile = require('../../utils/deleteFile');

const User = require('../../models/userModel');
const OTP = require('../../models/otpModel');
const Address = require('../../models/addressModel');
const City = require('../../models/cityModel');
const Country = require('../../models/countryModel');
const { sendOTP } = require("../../utils/sendSMS")

exports.checkUser = async (req, res, next) => {
    try {
        const token = req.headers.token;

        if (!token) return next(createError.BadRequest('auth.provideToken'));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        let user = await User.findById(decoded._id).select(
            '+blocked +password'
        );

        if (!user) return next(createError.BadRequest('auth.login'));
        if (user.blocked) return next(createError.Unauthorized('auth.blocked'));

        req.user = user;
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
        // if (!validator.isMobilePhone(mobile, 'any'))
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

// exports.sendOTP = async (req, res, next) => {
//     try {
//         const { country_code, phone } = req.body;

//         if (!country_code)
//             return next(createError.BadRequest('validation.country_code'));
//         if (!phone) 
//             return next(createError.BadRequest('validation.phone'));

//         const mobile = country_code + phone;

//         // Generate and save OTP
//         const otp = generateCode(4);
//         await OTP.updateOne(
//             { mobile },
//             { otp, expireAt: Date.now() + 2 * 60 * 1000 },
//             { upsert: true }
//         );

//         // Send OTP via SMS provider (Twilio)
//         try {
//             await sendOTP(mobile, otp);
//         } catch (smsError) {
//             console.error('SMS Provider Error:', smsError);
//             // OTP is saved in DB, but SMS failed
//             return next(createError.InternalServerError('otp.sendFailed'));
//         }

//         res.json({
//             code: '1',
//             message: req.t('otp.sent'),
//             result: {
//                 country_code,
//                 phone,
//                 // Only include OTP in development/testing
//                 ...(process.env.NODE_ENV !== 'production' && { otp })
//             },
//         });
//     } catch (error) {
//         next(error);
//     }
// };

exports.verifyOTP = async (req, res, next) => {
    try {
        const { country_code, phone, otp } = req.body;
        const mobile = country_code + phone;

        // verify otp
        const otpVerified = await OTP.findOne({ mobile, otp });
        if (!otpVerified) return next(createError.BadRequest('otp.fail'));

        // if userExists, login else send verifyToken
        const userExists = await User.findOne({ country_code, phone }).select(
            '-__v'
        );
        if (userExists) {
            userExists.fcmToken = req.body.fcmToken;
            await userExists.save();
            const token = await userExists.generateAuthToken();
            return res.json({
                code: '1',
                message: req.t('loggedIn'),
                token,
                user: userExists,
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

// exports.createProfile = async (req, res, next) => {
//     try {
//         const decoded = await promisify(jwt.verify)(
//             req.body.verifyToken,
//             process.env.JWT_SECRET
//         );
//         if (!decoded.phone) return next(createError.BadRequest('phone.verify'));

//         const { city_id, country_id } = req.body;
//         const [city, country] = await Promise.all([
//             City.findOne({ city_id }),
//             Country.findOne({ country_id }),
//         ]);

//         // 1. Handle file uploads
//         const profile = req.files?.profile?.[0] ? `/uploads/${req.files.profile[0].filename}` : undefined;
//         const licenseFront = req.files?.licenseFront?.[0] ? `/uploads/${req.files.licenseFront[0].filename}` : undefined;
//         const licenseBack = req.files?.licenseBack?.[0] ? `/uploads/${req.files.licenseBack[0].filename}` : undefined;

//         // 2. Create user
//         let user = new User({
//             name: req.body.name,
//             email: req.body.email,
//             country_code: decoded.country_code,
//             phone: decoded.phone,
//             city: city?.id,
//             country: country?.id,
//             profile,
//             licenseFront,
//             licenseBack,
//             fcmToken: req.body.fcmToken,
//         });

//         // 3. Create address
//         const address = new Address({
//             userId: user.id,
//             address: req.body.address,
//             latitude: req.body.latitude,
//             longitude: req.body.longitude,
//             selected: true,
//         });

//         // 4. Validate
//         await user.validate();
//         await address.validate();

//         user.address = address.id;
//         await Promise.all([user.save(), address.save()]);

//         const token = await user.generateAuthToken();
//         await user.populate('city country address');
//         user = multilingualUser(user, req);

//         user.latitude = user.address.latitude;
//         user.longitude = user.address.longitude;
//         user.address = user.address.address;

//         // Hide fields
//         user.password = undefined;
//         user.__v = undefined;

//         res.status(201).json({
//             code: '1',
//             message: req.t('profile'),
//             token,
//             user,
//         });

//     } catch (error) {
//         // 5. Delete uploaded files on error
//         const files = [
//             req.files?.profile?.[0],
//             req.files?.licenseFront?.[0],
//             req.files?.licenseBack?.[0]
//         ].filter(Boolean);
//         files.forEach(file => deleteFile(file.path));

//         if (error.name === 'JsonWebTokenError')
//             return next(createError.BadRequest('token.invalid'));
//         if (error.name === 'TokenExpiredError')
//             return next(createError.BadRequest('token.expired'));

//         next(error);
//     }
// };

exports.createProfile = async (req, res, next) => {
    try {
        // 1. Verify Token
        const decoded = await promisify(jwt.verify)(
            req.body.verifyToken,
            process.env.JWT_SECRET
        );
        if (!decoded.phone) return next(createError.BadRequest('phone.verify'));

        // 2. Extract fields (API ke hisaab se)
        const {
            name,
            email,
            address: addressText,
            city: city_id,          // form-data se "city" aayega
            country: country_id,    // form-data se "country" aayega
            referralCode,
            lat,
            lng,
            fcmToken,
        } = req.body;

        // 3. Find city & country
        const [city, country] = await Promise.all([
            City.findOne({ city_id }),
            Country.findOne({ country_id }),
        ]);

        if (!city || !country) {
            return next(createError.BadRequest('Invalid city or country'));
        }

        // 3.5 Referral code validate (optional) — sirf kisi user ka asli referral code hi chalega
        let referrer = null;
        const enteredCode = referralCode ? String(referralCode).trim().toUpperCase() : '';
        if (enteredCode) {
            referrer = await User.findOne({ myReferralCode: enteredCode }).select('_id name');
            if (!referrer) {
                // Code pehle kisi ne use kar liya (use hone par referrer ko naya code mil jata hai) ya galat hai
                const alreadyUsed = await User.exists({ referralCode: enteredCode });
                return next(createError.BadRequest(alreadyUsed ? 'This referral code has already been used' : 'Invalid referral code'));
            }
        }

        // 4. Handle file uploads
        const profile = req.files?.profile?.[0]
            ? `/uploads/${req.files.profile[0].filename}`
            : undefined;
        const licenseFront = req.files?.licenseFront?.[0]
            ? `/uploads/${req.files.licenseFront[0].filename}`
            : undefined;
        const licenseBack = req.files?.licenseBack?.[0]
            ? `/uploads/${req.files.licenseBack[0].filename}`
            : undefined;

        // 5. Create user
        let user = new User({
            name,
            email,
            country_code: decoded.country_code,
            phone: decoded.phone,
            city: city?.id,
            country: country?.id,
            referralCode: enteredCode || undefined,    // jo code user ne daala
            referredBy: referrer ? referrer._id : undefined, // kisne refer kiya
            myReferralCode: await generateUniqueReferralCode(name), // is user ka apna code
            profile,
            licenseFront,
            licenseBack,
            fcmToken,
        });

        // 6. Create address
        const address = new Address({
            userId: user.id,
            address: addressText,
            latitude: lat || req.body.latitude,
            longitude: lng || req.body.longitude,
            latitude: lat,
            longitude: lng,
            selected: true,
        });

        // 7. Validate
        await user.validate();
        await address.validate();

        // 7.5 Referral code SIRF EK BAAR — atomic claim: referrer ka code turant naya code se badal do.
        // Do log ek saath same code use karein to sirf ek ko milega, dusre ko 'already used' error.
        let usedCodeClaim = null; // { referrerId, newCode } — save fail hone par wapas karne ke liye
        if (referrer) {
            const newCode = await generateUniqueReferralCode(referrer.name);
            const claimed = await User.findOneAndUpdate(
                { _id: referrer._id, myReferralCode: enteredCode },
                { $set: { myReferralCode: newCode } }
            );
            if (!claimed) {
                return next(createError.BadRequest('This referral code has already been used'));
            }
            usedCodeClaim = { referrerId: referrer._id, newCode };
        }

        // 8. Link address & save
        user.address = address.id;
        try {
            await Promise.all([user.save(), address.save()]);
        } catch (saveErr) {
            // signup fail hua to code wapas free kar do
            if (usedCodeClaim) {
                await User.updateOne(
                    { _id: usedCodeClaim.referrerId, myReferralCode: usedCodeClaim.newCode },
                    { $set: { myReferralCode: enteredCode } }
                );
            }
            throw saveErr;
        }

        // 9. Generate token & populate
        const token = await user.generateAuthToken();
        await user.populate('city country address');
        user = multilingualUser(user, req);

        // Flatten address for response
        user.latitude = user.address?.latitude;
        user.longitude = user.address?.longitude;
        user.address = user.address?.address;

        // Hide sensitive fields
        user.password = undefined;
        user.__v = undefined;

        res.status(201).json({
            code: '1',
            message: req.t('profile'),
            token,
            user,
        });

    } catch (error) {
        // Delete uploaded files on error
        const files = [
            req.files?.profile?.[0],
            req.files?.licenseFront?.[0],
            req.files?.licenseBack?.[0],
        ].filter(Boolean);

        files.forEach(file => deleteFile(file.path));

        if (error.name === 'JsonWebTokenError')
            return next(createError.BadRequest('token.invalid'));
        if (error.name === 'TokenExpiredError')
            return next(createError.BadRequest('token.expired'));

        next(error);
    }
};

exports.socialLogin = async (req, res, next) => {
    try {
        const { email, googleId, facebookId, appleId } = req.body;

        let user = await User.findOne({ email }).populate(
            'city country address'
        );

        // if user exists, redirect to create profile screen
        if (!user) {
            return res.json({
                code: '001',
                message: req.t('success'),
                user: { email, googleId, facebookId, appleId },
            });
        }

        if (googleId) {
            if (!user.googleId) {
                const errorMessage = user.facebookId
                    ? 'social.facebook'
                    : user.appleId
                        ? 'social.apple'
                        : 'social.phone';
                return next(createError.BadRequest(errorMessage));
            }
            if (googleId !== user.googleId) {
                return next(createError.BadRequest('social.invalidGoogle'));
            }
        }

        if (facebookId) {
            if (!user.facebookId) {
                const errorMessage = user.googleId
                    ? 'social.google'
                    : user.appleId
                        ? 'social.apple'
                        : 'social.phone';
                return next(createError.BadRequest(errorMessage));
            }
            if (facebookId !== user.facebookId) {
                return next(createError.BadRequest('social.invalidFacebook'));
            }
        }

        if (appleId) {
            if (!user.appleId) {
                const errorMessage = user.googleId
                    ? 'social.google'
                    : user.facebookId
                        ? 'social.facebook'
                        : 'social.phone';
                return next(createError.BadRequest(errorMessage));
            }
            if (appleId !== user.appleId) {
                return next(createError.BadRequest('social.invalidApple'));
            }
        }

        user.fcmToken = req.body.fcmToken;
        await user.save();
        const token = await user.generateAuthToken();

        user = multilingualUser(user, req);
        user.latitude = user.address.latitude;
        user.longitude = user.address.longitude;
        user.address = user.address.address;

        return res.json({
            code: '1',
            message: req.t('loggedIn'),
            token,
            user,
        });
    } catch (error) {
        next(error);
    }
};

// exports.createSocialProfile = async (req, res, next) => {
//     try {
//         const { city_id, country_id } = req.body;
//         const [city, country] = await Promise.all([
//             City.findOne({ city_id }),
//             Country.findOne({ country_id }),
//         ]);

//         // 1. Handle file uploads
//         const profile = req.files?.profile?.[0] ? `/uploads/${req.files.profile[0].filename}` : undefined;
//         const licenseFront = req.files?.licenseFront?.[0] ? `/uploads/${req.files.licenseFront[0].filename}` : undefined;
//         const licenseBack = req.files?.licenseBack?.[0] ? `/uploads/${req.files.licenseBack[0].filename}` : undefined;

//         // 2. Create user
//         let user = new User({
//             name: req.body.name,
//             email: req.body.email,
//             country_code: req.body.country_code,
//             phone: req.body.phone,
//             city: city?.id,
//             country: country?.id,
//             googleId: req.body.googleId,
//             facebookId: req.body.facebookId,
//             appleId: req.body.appleId,
//             profile,
//             licenseFront,
//             licenseBack,
//             fcmToken: req.body.fcmToken,
//         });

//         // 3. Create address
//         const address = new Address({
//             userId: user.id,
//             address: req.body.address,
//             latitude: req.body.latitude,
//             longitude: req.body.longitude,
//             selected: true,
//         });

//         // 4. Validate
//         await user.validate();
//         await address.validate();

//         user.address = address.id;
//         await Promise.all([user.save(), address.save()]);

//         const token = await user.generateAuthToken();
//         await user.populate('city country address');
//         user = multilingualUser(user, req);

//         user.latitude = user.address.latitude;
//         user.longitude = user.address.longitude;
//         user.address = user.address.address;

//         // Hide fields
//         user.password = undefined;
//         user.__v = undefined;

//         res.status(201).json({
//             code: '1',
//             message: req.t('profile'),
//             token,
//             user,
//         });

//     } catch (error) {
//         // 5. Delete uploaded files on error
//         const files = [
//             req.files?.profile?.[0],
//             req.files?.licenseFront?.[0],
//             req.files?.licenseBack?.[0]
//         ].filter(Boolean);
//         files.forEach(file => deleteFile(file.path));

//         if (error.name === 'JsonWebTokenError')
//             return next(createError.BadRequest('token.invalid'));
//         if (error.name === 'TokenExpiredError')
//             return next(createError.BadRequest('token.expired'));

//         next(error);
//     }
// };

exports.createSocialProfile = async (req, res, next) => {
    try {
        console.log('=== createSocialProfile START ===');
        console.log('req.body:', JSON.stringify(req.body, null, 2));
        console.log('req.files:', req.files ? Object.keys(req.files) : 'no files');

        const { city_id, country_id } = req.body;
        const [city, country] = await Promise.all([
            City.findOne({ city_id }),
            Country.findOne({ country_id }),
        ]);

        console.log('city found:', city ? city._id : 'NOT FOUND');
        console.log('country found:', country ? country._id : 'NOT FOUND');

        // 1. Handle file uploads
        const profile = req.files?.profile?.[0]
            ? `/uploads/${req.files.profile[0].filename}`
            : undefined;
        const licenseFront = req.files?.licenseFront?.[0]
            ? `/uploads/${req.files.licenseFront[0].filename}`
            : undefined;
        const licenseBack = req.files?.licenseBack?.[0]
            ? `/uploads/${req.files.licenseBack[0].filename}`
            : undefined;

        console.log('profile path:', profile);

        // ✅ FIX: Empty string ko undefined karo taaki MongoDB skip kare
        const googleId = req.body.googleId || undefined;
        const facebookId = req.body.facebookId || undefined;
        const appleId = req.body.appleId || undefined;

        console.log('googleId from body:', googleId);
        console.log('facebookId from body:', facebookId);
        console.log('appleId from body:', appleId);

        // 2. Create user
        let user = new User({
            name: req.body.name,
            email: req.body.email,
            country_code: req.body.country_code,
            phone: req.body.phone,
            city: city?.id,
            country: country?.id,
            googleId,    // ✅ undefined pass hoga agar empty string aayi
            facebookId,
            appleId,
            profile,
            licenseFront,
            licenseBack,
            fcmToken: req.body.fcmToken,
        });

        console.log('user object before save:', {
            name: user.name,
            email: user.email,
            phone: user.phone,
            country_code: user.country_code,
            googleId: user.googleId,
            facebookId: user.facebookId,
            appleId: user.appleId,
        });

        // 3. Create address
        const address = new Address({
            userId: user.id,
            address: req.body.address,
            latitude: req.body.latitude,
            longitude: req.body.longitude,
            selected: true,
        });

        // 4. Validate
        console.log('Validating user...');
        await user.validate();
        console.log('✅ User validation passed');

        await address.validate();
        console.log('✅ Address validation passed');

        user.address = address.id;
        await Promise.all([user.save(), address.save()]);
        console.log('✅ User saved to DB. User _id:', user._id);

        // ✅ DB se re-fetch karke confirm karo ki values save hui
        const savedUser = await User.findById(user._id).select(
            'googleId facebookId appleId email phone'
        );
        console.log('=== DB se re-fetched user ===');
        console.log('savedUser.googleId:', savedUser.googleId);
        console.log('savedUser.facebookId:', savedUser.facebookId);
        console.log('savedUser.appleId:', savedUser.appleId);

        const token = await user.generateAuthToken();
        await user.populate('city country address');
        user = multilingualUser(user, req);

        user.latitude = user.address?.latitude;
        user.longitude = user.address?.longitude;
        user.address = user.address?.address;

        user.password = undefined;
        user.__v = undefined;

        console.log('=== createSocialProfile SUCCESS ===');

        res.status(201).json({
            code: '1',
            message: req.t('profile'),
            token,
            user,
        });

    } catch (error) {
        console.error('=== createSocialProfile ERROR ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);

        // ✅ Mongoose validation errors detail mein dikhao
        if (error.name === 'ValidationError') {
            console.error('Validation errors:');
            Object.keys(error.errors).forEach(field => {
                console.error(`  ${field}: ${error.errors[field].message}`);
            });
        }

        // ✅ Duplicate key error (phone/email already exists)
        if (error.code === 11000) {
            console.error('Duplicate key error:', error.keyValue);
            return next(createError.Conflict(
                `${Object.keys(error.keyValue)[0]} already exists`
            ));
        }

        // 5. Delete uploaded files on error
        const files = [
            req.files?.profile?.[0],
            req.files?.licenseFront?.[0],
            req.files?.licenseBack?.[0],
        ].filter(Boolean);
        files.forEach(file => {
            console.log('Deleting file on error:', file.path);
            deleteFile(file.path);
        });

        if (error.name === 'JsonWebTokenError')
            return next(createError.BadRequest('token.invalid'));
        if (error.name === 'TokenExpiredError')
            return next(createError.BadRequest('token.expired'));

        next(error);
    }
};

// ======================================================
// 1. ENABLE BIOMETRIC (Login ke baad call hoga)
// ======================================================
exports.enableBiometric = async (req, res, next) => {
    try {
        const user = req.user; // checkUser middleware se aayega
        const { deviceId } = req.body; // optional

        // Generate long lived biometric token
        const biometricToken = user.generateBiometricToken();

        user.biometricEnabled = true;
        user.biometricToken = biometricToken;
        if (deviceId) user.biometricDeviceId = deviceId;

        await user.save();

        res.json({
            code: '1',
            message: req.t('biometric.enabled') || 'Biometric enabled successfully',
            biometricToken, // <-- ye client securely store karega (Keychain/Keystore)
        });
    } catch (error) {
        next(error);
    }
};

// ======================================================
// 2. BIOMETRIC LOGIN
// ======================================================
exports.biometricLogin = async (req, res, next) => {
    try {
        const { biometricToken, fcmToken, deviceId } = req.body;

        if (!biometricToken) {
            return next(createError.BadRequest('biometric.tokenRequired'));
        }

        // Verify biometric token
        let decoded;
        try {
            decoded = jwt.verify(biometricToken, process.env.JWT_SECRET);
        } catch (err) {
            return next(createError.Unauthorized('biometric.invalidToken'));
        }

        if (decoded.type !== 'biometric') {
            return next(createError.Unauthorized('biometric.invalidToken'));
        }

        // Find user with biometricToken
        const user = await User.findOne({
            _id: decoded._id,
            biometricToken,
            biometricEnabled: true,
        }).select('+biometricToken +biometricDeviceId +blocked');

        if (!user) {
            return next(createError.Unauthorized('biometric.notEnabled'));
        }

        if (user.blocked) {
            return next(createError.Unauthorized('auth.blocked'));
        }

        // Optional: Device ID check (extra security)
        if (deviceId && user.biometricDeviceId && user.biometricDeviceId !== deviceId) {
            return next(createError.Unauthorized('biometric.deviceMismatch'));
        }

        // Update FCM token if provided
        if (fcmToken) {
            user.fcmToken = fcmToken;
            await user.save();
        }

        // Generate normal auth token
        const token = await user.generateAuthToken();

        // Populate & format response
        await user.populate('city country address');
        let formattedUser = multilingualUser(user, req);

        formattedUser.latitude = formattedUser.address?.latitude;
        formattedUser.longitude = formattedUser.address?.longitude;
        formattedUser.address = formattedUser.address?.address;

        formattedUser.password = undefined;
        formattedUser.__v = undefined;
        formattedUser.biometricToken = undefined;

        res.json({
            code: '1',
            message: req.t('loggedIn'),
            token,
            user: formattedUser,
        });
    } catch (error) {
        next(error);
    }
};

// ======================================================
// 3. DISABLE BIOMETRIC
// ======================================================
exports.disableBiometric = async (req, res, next) => {
    try {
        const user = req.user;

        user.biometricEnabled = false;
        user.biometricToken = undefined;
        user.biometricDeviceId = undefined;

        await user.save();

        res.json({
            code: '1',
            message: req.t('biometric.disabled') || 'Biometric disabled successfully',
        });
    } catch (error) {
        next(error);
    }
};