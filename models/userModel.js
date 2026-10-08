// const mongoose = require('mongoose');
// const validator = require('validator');
// const createError = require('http-errors');
// const jwt = require('jsonwebtoken');

// const userSchema = new mongoose.Schema({
//     name: {
//         type: String,
//     },
//     country_code: {
//         type: String,
//         required: [true, 'validation.country_code'],
//     },
//     phone: {
//         type: String,
//         required: [true, 'validation.phone'],
//         unique: true,
//     },
//     email: {
//         type: String,
//         unique: true,
//         required: [true, 'validation.email'],
//         lowercase: true,
//         // validate: [validator.isEmail, 'validation.emailInvalid'],
//     },
//     googleId: String,
//     facebookId: String,
//     appleId: String,
//     city: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'City',
//         // required: [true, 'validation.city'],
//     },
//     country: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Country',
//         // required: [true, 'validation.country'],
//     },
//     address: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Address',
//     },
//     // ! change default image to s3
//     profile: {
//         type: String,
//         default: '/uploads/default_user.jpg',
//     },
//     licenseFront: String,
//     licenseBack: String,
//     blocked: {
//         type: Boolean,
//         default: false,
//         select: false,
//         immutable: true,
//     },
//     favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Car' }],
//     fcmToken: { type: String },
//     stripeCustomerId: { type: String }, // Stripe customer ID
//     defaultPaymentMethod: { type: String }, // Default Stripe payment method ID
//     date: {
//         type: Date,
//         default: Date.now,
//     },
//     referralCode: {
//         type: String,
//         trim: true,
//         default: undefined,
//     },

//      myReferralCode: {
//         type: String,
//         trim: true,
//         uppercase: true,
//         unique: true,
//         sparse: true,
//         default: undefined,
//     },
//     // ====================== BIOMETRIC FIELDS ======================
//     biometricEnabled: {
//         type: Boolean,
//         default: false,
//     },
//     biometricToken: {
//         type: String,
//         select: false,
//     },
//     biometricDeviceId: {
//         type: String,
//         select: false,
//     },
//     // city: {
//     //     type: String,   // e.g. "Ahmedabad"
//     // },
//     // country: {
//     //     type: String,   // e.g. "India"
//     // },

//     city: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'City',
//     },
//     country: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Country',
//     },
//     gender: {
//         type: String,
//         enum: ['Male', 'Female', 'Other'],
//     },
// });

// // generating tokens
// userSchema.methods.generateAuthToken = async function () {
//     try {
//         return jwt.sign({ _id: this._id.toString() }, process.env.JWT_SECRET, {
//             expiresIn: '90d',
//         });
//     } catch (error) {
//         throw createError.BadRequest(error);
//     }
// };

// // Biometric Token generate karne ke liye helper
// userSchema.methods.generateBiometricToken = function () {
//     return jwt.sign(
//         {
//             _id: this._id.toString(),
//             type: 'biometric'
//         },
//         process.env.JWT_SECRET,
//         { expiresIn: '365d' }   // 1 year valid
//     );
// };

// module.exports = new mongoose.model('User', userSchema);

const mongoose = require('mongoose');
const validator = require('validator');
const createError = require('http-errors');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    country_code: {
        type: String,
        required: [true, 'validation.country_code'],
    },
    phone: {
        type: String,
        required: [true, 'validation.phone'],
        unique: true,
    },
    email: {
        type: String,
        unique: true,
        required: [true, 'validation.email'],
        lowercase: true,
        // validate: [validator.isEmail, 'validation.emailInvalid'],
    },
    googleId: String,
    facebookId: String,
    appleId: String,
    city: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'City',
        // required: [true, 'validation.city'],
    },
    country: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Country',
        // required: [true, 'validation.country'],
    },
    address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address',
    },
    // ! change default image to s3
    profile: {
        type: String,
        default: '/uploads/default_user.jpg',
    },
    licenseFront: String,
    licenseBack: String,
    blocked: {
        type: Boolean,
        default: false,
        select: false,
        immutable: true,
    },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Car' }],
    fcmToken: { type: String },
    stripeCustomerId: { type: String }, // Stripe customer ID
    defaultPaymentMethod: { type: String }, // Default Stripe payment method ID
    date: {
        type: Date,
        default: Date.now,
    },
    referralCode: {
        type: String,
        trim: true,
        default: undefined,
    },
    // User ka APNA referral code (doosron ko share karne ke liye).
    // NOTE: upar wala `referralCode` wo code hai jo user ne signup par daala tha (kisne refer kiya).
    myReferralCode: {
        type: String,
        trim: true,
        uppercase: true,
        unique: true,
        sparse: true,
        default: undefined,
    },
    // Kis user ke referral code se signup hua (referee ke liye)
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: undefined,
    },
    // Referral bonus mil chuka hai ya nahi (sirf ek baar milta hai)
    referralRewarded: { type: Boolean, default: false },
    // ====================== BIOMETRIC FIELDS ======================
    biometricEnabled: {
        type: Boolean,
        default: false,
    },
    biometricToken: {
        type: String,
        select: false,
    },
    biometricDeviceId: {
        type: String,
        select: false,
    },
    // city: {
    //     type: String,   // e.g. "Ahmedabad"
    // },
    // country: {
    //     type: String,   // e.g. "India"
    // },

    city: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'City',
    },
    country: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Country',
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
    },
});

// generating tokens
userSchema.methods.generateAuthToken = async function () {
    try {
        return jwt.sign({ _id: this._id.toString() }, process.env.JWT_SECRET, {
            expiresIn: '90d',
        });
    } catch (error) {
        throw createError.BadRequest(error);
    }
};

// Biometric Token generate karne ke liye helper
userSchema.methods.generateBiometricToken = function () {
    return jwt.sign(
        {
            _id: this._id.toString(),
            type: 'biometric'
        },
        process.env.JWT_SECRET,
        { expiresIn: '365d' }   // 1 year valid
    );
};

module.exports = new mongoose.model('User', userSchema);