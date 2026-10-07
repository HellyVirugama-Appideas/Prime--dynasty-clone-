const mongoose = require('mongoose');

// Driver ko mila hua har incentive reward (Bonus history + double credit se bachav)
const rewardSchema = new mongoose.Schema(
    {
        driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true, index: true },
        incentive: { type: mongoose.Schema.Types.ObjectId, ref: 'Incentive', required: true },
        period: { type: String, enum: ['daily', 'weekly', 'bonus'], required: true },

        // daily -> '2026-10-02', weekly -> week start date, bonus -> 'all'
        periodKey: { type: String, required: true },
        tierTarget: { type: Number, required: true },

        reward: { type: Number, required: true }, // currency me (cents nahi)
        bonusName: String, // "Daily Bonus"
        title: String, // "₹25 Daily Bonus"
        label: String, // "Complete 15 Rides"

        status: { type: String, enum: ['credited'], default: 'credited' },
        walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },
    },
    { timestamps: true }
);

// Ek driver ko ek incentive ka ek milestone ek period me sirf ek baar
rewardSchema.index({ driver: 1, incentive: 1, periodKey: 1, tierTarget: 1 }, { unique: true });
rewardSchema.index({ driver: 1, createdAt: -1 });

module.exports = mongoose.model('DriverIncentiveReward', rewardSchema);