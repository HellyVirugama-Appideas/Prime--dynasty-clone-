const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    title: { type: String, required: true },        // "Save $10 on your ride"
    code: { type: String, required: true, unique: true, uppercase: true, trim: true }, // "WELCOME10"
    image: { type: String },                          // offer banner image
    description: { type: String },

    discountType: {
        type: String,
        enum: ['flat', 'percentage'],
        required: true,
    },
    discountValue: { type: Number, required: true },   // flat: $ amount, percentage: 0-100
    maxDiscount: { type: Number, default: 0 },          // cap for percentage type (0 = no cap)
    minOrderAmount: { type: Number, default: 0 },       // minimum fare/rent to apply

    applicableOn: {
        type: String,
        enum: ['ride', 'rent', 'all'],
        default: 'all',
    },

    // ==================== Progress-type offers ====================
    // ("Complete 20 rides in a month", "Ride 3 times between 6-9 AM", etc.
    // — screens with a progress bar like "13 more rides to earn $25 bonus")
    offerType: {
        type: String,
        enum: ['coupon', 'progress'],
        default: 'coupon',
    },
    progressType: {
        type: String,
        enum: ['rides_in_period', 'consecutive_days', 'rides_in_time_window'],
    },
    periodType: {
        type: String,
        enum: ['week', 'month'],
    },
    targetCount: { type: Number, default: 0 },     // e.g. 20 rides / 7 days
    rewardValue: { type: Number, default: 0 },      // $ credited on completion
    rewardType: {
        type: String,
        enum: ['wallet_credit', 'coupon'],
        default: 'wallet_credit',
    },
    timeWindowStart: { type: String },              // 'HH:mm', for rides_in_time_window
    timeWindowEnd: { type: String },                // 'HH:mm', for rides_in_time_window

    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },

    usageLimitPerUser: { type: Number, default: 1 },    // 0 = unlimited
    totalUsageLimit: { type: Number, default: 0 },      // 0 = unlimited
    totalUsedCount: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);