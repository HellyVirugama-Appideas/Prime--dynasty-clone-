const mongoose = require('mongoose');

/**
 * Phase 1 - MVP Fare System
 * Single active configuration document. Admin can edit this from the
 * Admin Panel (Fare Settings) without needing any mobile app update.
 *
 * Total Fare = Base Fare (by trip type) + (Per-Mile Charge x Distance) + Fees
 * Short trips do NOT include distance-based pricing (per spec section 4.3).
 */

const feeSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true }, // Platform Fee / Technology Fee / Booking Fee
        amount: { type: Number, required: true, default: 0, min: 0 },
        enabled: { type: Boolean, default: true },
    },
    { _id: false }
);

const perMileTierSchema = new mongoose.Schema(
    {
        // Upper bound of this tier in miles. Use 0 (or null) for the final
        // "and above" catch-all tier (e.g. "30+ miles").
        upToMiles: { type: Number, default: 0, min: 0 },
        ratePerMile: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const fareConfigSchema = new mongoose.Schema(
    {
        // Section 3 — Trip Type Classification thresholds (distance based, km)
        tripTypeThresholds: {
            shortMaxDistanceKm: { type: Number, required: true, default: 8, min: 0 }, // <= this => Short
            mediumMaxDistanceKm: { type: Number, required: true, default: 24, min: 0 }, // <= this => Medium, above => Long
        },

        // Section 4.1.2 — Dynamic Base Fare per trip type
        baseFare: {
            short: { type: Number, required: true, default: 6, min: 0 },
            medium: { type: Number, required: true, default: 16, min: 0 },
            long: { type: Number, required: true, default: 18, min: 0 },
        },

        // Section 4.3 — Distance-Based Rides (per-mile tiers)
        perMileRateTiers: {
            type: [perMileTierSchema],
            default: [
                { upToMiles: 10, ratePerMile: 2.5 },
                { upToMiles: 20, ratePerMile: 2.75 },
                { upToMiles: 0, ratePerMile: 2.8 }, // 30+ miles / catch-all
            ],
        },

        // Section 4.3 — Fees (Platform / Technology / Booking). Admin can
        // enable/disable each rule individually; sum of enabled fees is
        // applied as the flat "Platform Fee" line in the fare breakup.
        fees: {
            type: [feeSchema],
            default: [
                { name: 'Platform Fee', amount: 8.99, enabled: true },
                { name: 'Technology Fee', amount: 8.99, enabled: false },
                { name: 'Booking Fee', amount: 8.99, enabled: false },
            ],
        },

        isActive: { type: Boolean, default: true },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('FareConfig', fareConfigSchema);
