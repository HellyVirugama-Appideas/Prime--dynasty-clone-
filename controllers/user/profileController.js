const createError = require('http-errors');
const multilingualUser = require('../../utils/multilingualUser');
const deleteFile = require('../../utils/deleteFile');

const User = require('../../models/userModel');
const Address = require('../../models/addressModel');
const validator = require('validator');

// exports.getProfile = async (req, res, next) => {
//     try {
//         await req.user.populate('city country address');
//         const user = multilingualUser(req.user, req);

//         user.latitude = user.address?.latitude;
//         user.longitude = user.address?.longitude;
//         user.address = user.address?.address;

//         // Hide fields
//         user.blocked = undefined;

//         res.json({ code: '1', message: req.t('success'), user });
//     } catch (error) {
//         next(error);
//     }
// };
exports.getProfile = async (req, res, next) => {
    try {
        await req.user.populate('city country address');

        // multilingualUser se pehle raw values nikal lo
        const phone = req.user.phone;
        const country_code = req.user.country_code;

        let user = multilingualUser(req.user, req);

        user.phone = user.phone || phone;
        user.country_code = user.country_code || country_code;

        user.latitude = user.address?.latitude;
        user.longitude = user.address?.longitude;
        user.address = user.address?.address;

        user.password = undefined;
        user.__v = undefined;

        res.json({ code: '1', message: req.t('success'), user });
    } catch (error) {
        next(error);
    }
};
// exports.editProfile = async (req, res, next) => {
//     try {
//         // 1. Remove disallowed properties
//         const disallowedProperties = [
//             'country_code',
//             'phone',
//             'googleId',
//             'facebookId',
//             'appleId',
//             'profile',
//             'licenseFront',
//             'licenseBack',
//         ];
//         disallowedProperties.forEach(prop => delete req.body[prop]);

//         // 2. Handle file uploads
//         if (req.files?.profile?.[0]) {
//             if (req.user.profile) deleteFile(`public${req.user.profile}`);
//             req.body.profile = `/uploads/${req.files.profile[0].filename}`;
//         }
//         if (req.files?.licenseFront?.[0]) {
//             if (req.user.licenseFront) deleteFile(`public${req.user.licenseFront}`);
//             req.body.licenseFront = `/uploads/${req.files.licenseFront[0].filename}`;
//         }
//         if (req.files?.licenseBack?.[0]) {
//             if (req.user.licenseBack) deleteFile(`public${req.user.licenseBack}`);
//             req.body.licenseBack = `/uploads/${req.files.licenseBack[0].filename}`;
//         }

//         // 3. Update user
//         let user = await User.findByIdAndUpdate(
//             req.user.id,
//             req.body,
//             { new: true, runValidators: true }
//         ).populate('city country address');

//         if (!user) {
//             // Delete new files if user not found
//             const files = [
//                 req.files?.profile?.[0],
//                 req.files?.licenseFront?.[0],
//                 req.files?.licenseBack?.[0]
//             ].filter(Boolean);
//             files.forEach(file => deleteFile(file.path));
//             return next(createError.NotFound('User not found'));
//         }

//         // 4. Format response
//         user = multilingualUser(user, req);
//         user.latitude = user.address.latitude;
//         user.longitude = user.address.longitude;
//         user.address = user.address.address;

//         // Hide sensitive fields
//         user.password = undefined;
//         user.__v = undefined;

//         res.json({ code: '1', message: req.t('success'), user });

//     } catch (error) {
//         // 5. Delete uploaded files on error
//         const files = [
//             req.files?.profile?.[0],
//             req.files?.licenseFront?.[0],
//             req.files?.licenseBack?.[0]
//         ].filter(Boolean);
//         files.forEach(file => deleteFile(file.path));

//         next(error);
//     }
// };
exports.editProfile = async (req, res, next) => {
    // Error par upload hui files hata do
    const cleanupFiles = () => {
        [
            req.files?.profile?.[0],
            req.files?.licenseFront?.[0],
            req.files?.licenseBack?.[0],
        ]
            .filter(Boolean)
            .forEach(file => deleteFile(file.path));
    };

    try {
        // 1. Remove disallowed properties
        const disallowedProperties = [
            'country_code',
            'phone',
            'googleId',
            'facebookId',
            'appleId',
            'profile',
            'licenseFront',
            'licenseBack',
        ];
        disallowedProperties.forEach(prop => delete req.body[prop]);

        // ========== EMAIL (optional) ==========
        if (req.body.email !== undefined) {
            const email = String(req.body.email).trim().toLowerCase();

            if (!email) {
                // khali bheja to ignore karo
                delete req.body.email;
            } else {
                if (!validator.isEmail(email)) {
                    cleanupFiles();
                    return next(createError.BadRequest('Invalid email address.'));
                }

                // Same email ho to duplicate check skip
                if (email !== req.user.email) {
                    const emailTaken = await User.findOne({
                        email,
                        _id: { $ne: req.user.id },
                    }).select('_id');

                    if (emailTaken) {
                        cleanupFiles();
                        return next(
                            createError.Conflict('This email is already registered.')
                        );
                    }
                }

                req.body.email = email;
            }
        }
        // ========== EMAIL END ==========

        // ========== GENDER FIX START ==========
        if (req.body.gender) {
            const g = String(req.body.gender).toLowerCase().trim();

            if (g === 'male') {
                req.body.gender = 'Male';
            } else if (g === 'female') {
                req.body.gender = 'Female';
            } else if (g === 'other') {
                req.body.gender = 'Other';
            } else {
                cleanupFiles();
                return next(createError.BadRequest('Invalid gender. Allowed: Male, Female, Other'));
            }
        }
        // ========== GENDER FIX END ==========

        // 2. Handle file uploads
        if (req.files?.profile?.[0]) {
            if (req.user.profile) deleteFile(`public${req.user.profile}`);
            req.body.profile = `/uploads/${req.files.profile[0].filename}`;
        }
        if (req.files?.licenseFront?.[0]) {
            if (req.user.licenseFront) deleteFile(`public${req.user.licenseFront}`);
            req.body.licenseFront = `/uploads/${req.files.licenseFront[0].filename}`;
        }
        if (req.files?.licenseBack?.[0]) {
            if (req.user.licenseBack) deleteFile(`public${req.user.licenseBack}`);
            req.body.licenseBack = `/uploads/${req.files.licenseBack[0].filename}`;
        }

        // 3. Update user
        let user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).populate('city country address');

        if (!user) {
            cleanupFiles();
            return next(createError.NotFound('User not found'));
        }

        // 4. Format response
        user = multilingualUser(user, req);
        user.latitude = user.address?.latitude;
        user.longitude = user.address?.longitude;
        user.address = user.address?.address;

        user.password = undefined;
        user.__v = undefined;

        res.json({ code: '1', message: req.t('success'), user });
    } catch (error) {
        cleanupFiles();

        // Race condition: do requests ek saath same email le len
        if (error.code === 11000) {
            return next(createError.Conflict('This email is already registered.'));
        }
        next(error);
    }
};
// exports.deleteProfile = async (req, res, next) => {
//     try {
//         // TODO soft delete
//         // Delete user, addresses
//         await Promise.all([
//             User.findByIdAndDelete(req.user.id),
//             Address.deleteMany({ userId: req.user.id }),
//         ]);

//         res.json({ code: '1', message: req.t('deleted') });
//     } catch (error) {
//         next(error);
//     }
// };

exports.deleteProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Hard delete user + related addresses
        await Promise.all([
            User.findByIdAndDelete(userId),
            Address.deleteMany({ userId }),
        ]);

        // Optional: agar aur related data bhi delete karni ho
        // await OfferRedemption.deleteMany({ userId });
        // await UserOfferProgress.deleteMany({ userId });

        res.json({ code: '1', message: req.t('deleted') });
    } catch (error) {
        next(error);
    }
};

exports.addressList = async (req, res, next) => {
    try {
        const address_list = await Address.find({ userId: req.user.id }).select(
            '-__v -userId'
        );

        res.json({ code: '1', message: req.t('success'), address_list });
    } catch (error) {
        next(error);
    }
};

exports.addAddress = async (req, res, next) => {
    try {
        const address = await Address.create({
            userId: req.user.id,
            address: req.body.address,
            latitude: req.body.latitude,
            longitude: req.body.longitude,
        });

        address.userId = undefined;
        address.__v = undefined;

        res.json({ code: '1', message: req.t('address.added'), address });
    } catch (error) {
        next(error);
    }
};

exports.editAddress = async (req, res, next) => {
    try {
        const address = await Address.findOneAndUpdate(
            { _id: req.body.id, userId: req.user.id },
            {
                address: req.body.address,
                latitude: req.body.latitude,
                longitude: req.body.longitude,
            },
            { new: true }
        ).select('-__v -userId');

        if (!address) return next(createError.NotFound('Address not found.'));

        res.json({ code: '1', message: req.t('address.edited'), address });
    } catch (error) {
        next(error);
    }
};

exports.deleteAddress = async (req, res, next) => {
    try {
        await Address.findOneAndDelete({
            _id: req.body.id,
            userId: req.user.id,
        });

        res.json({ code: '1', message: req.t('address.deleted') });
    } catch (error) {
        next(error);
    }
};

exports.selectAddress = async (req, res, next) => {
    try {
        const address = await Address.findOne({
            _id: req.body.id,
            userId: req.user.id,
        });
        if (!address) return next(createError.NotFound('Address not found.'));

        address.selected = true;
        await Promise.all([
            address.save(),
            User.findByIdAndUpdate(req.user.id, { address: address.id }),
        ]);

        res.json({ code: '1', message: req.t('address.selected'), address });
    } catch (error) {
        next(error);
    }
};
