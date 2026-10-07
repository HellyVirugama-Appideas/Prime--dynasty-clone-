const mongoose = require('mongoose');

// Ek milestone: "target" tak pahunchne par "reward" milta hai
// (target = rides / distance / days, reward = amount currency me, cents me nahi)
const tierSchema = new mongoose.Schema(
    {
        target: { type: Number, required: true, min: 0.01 },
        reward: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const incentiveSchema = new mongoose.Schema(
    {
        // Optional. Khaali ho to app ko auto title milta hai: "Earn up to ₹15"
        title: { type: String, trim: true },
        // Optional. Khaali ho to auto text: "by completing 20 rides in a day"
        description: { type: String, trim: true },
        // Bonus history me dikhne wala naam: "Daily Bonus", "Flash Bonus", "Weekly Bonus"...
        bonusName: { type: String, trim: true },

        // Driver app ke 3 tabs: Daily | Weekly | Bonus
        period: { type: String, enum: ['daily', 'weekly', 'bonus'], required: true },

        // Kis cheez ko gina jayega
        //   rides    -> complete hui rides
        //   distance -> total distance (distanceUnit me)
        //   days     -> sirf weekly: kitne din minRidesPerDay rides complete hui ("1 ride/day for 7 days")
        metric: { type: String, enum: ['rides', 'distance', 'days'], required: true },
        distanceUnit: { type: String, enum: ['km', 'mi'], default: 'km' },
        minRidesPerDay: { type: Number, default: 1, min: 1 }, // sirf metric = days ke liye

        // Optional time window ("06:00" - "09:00"), sirf is time me complete hui rides count hongi
        timeWindowStart: { type: String, trim: true },
        timeWindowEnd: { type: String, trim: true },

        // Sirf daily ke liye: 0 = Sunday ... 6 = Saturday. Khaali = har din
        daysOfWeek: { type: [Number], default: [] },

        validFrom: { type: Date, required: true },
        validTo: { type: Date, required: true },

        tiers: {
            type: [tierSchema],
            validate: {
                validator: (v) => Array.isArray(v) && v.length > 0,
                message: 'At least one milestone is required.',
            },
        },

        sortOrder: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

incentiveSchema.index({ period: 1, isActive: 1, isDeleted: 1, validFrom: 1, validTo: 1 });

module.exports = mongoose.model('Incentive', incentiveSchema);