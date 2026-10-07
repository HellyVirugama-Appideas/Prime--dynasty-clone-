const mongoose = require('mongoose');

const rideReqSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    acceptedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        default: null,
    },

    pickupAddress: {
        type: String,
        required: [true, 'pickupAddress is required.'],
    },
    pickupLat: { type: String, required: [true, 'pickupLat is required.'] },
    pickupLng: { type: String, required: [true, 'pickupLng is required.'] },

    endAddress: { type: String, required: [true, 'endAddress is required.'] },
    endLat: { type: String, required: [true, 'endLat is required.'] },
    endLng: { type: String, required: [true, 'endLng is required.'] },

    type: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Type',
        required: [true, 'type is required.'],
    },
    isSchedule: { type: Boolean, default: false },
    scheduleTime: Date,
    price: { type: Number, required: [true, 'Price is required.'] },

    // Phase 1 — MVP Fare System: trip classification + backend fare breakup snapshot
    tripType: { type: String, enum: ['Short', 'Medium', 'Long'], default: null },
    baseFare: { type: Number, default: 0 },
    distanceCharge: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 },
    surgeCharge: { type: Number, default: 0 },
    estimatedTotal: { type: Number, default: 0 },

    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600, // sec
    },
});

module.exports = new mongoose.model('Ride request', rideReqSchema);
