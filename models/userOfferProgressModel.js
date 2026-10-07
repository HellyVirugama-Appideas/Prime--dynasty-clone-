const mongoose = require('mongoose');

const userOfferProgressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true },
    currentCount: { type: Number, default: 0 },
    lastRideDate: { type: Date },
    consecutiveDays: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
    rewardClaimed: { type: Boolean, default: false },
}, { timestamps: true });

userOfferProgressSchema.index({ userId: 1, offerId: 1 }, { unique: true });

module.exports = mongoose.model('UserOfferProgress', userOfferProgressSchema);