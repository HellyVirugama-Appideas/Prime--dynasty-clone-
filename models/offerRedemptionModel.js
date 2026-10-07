// const mongoose = require('mongoose');

// const offerRedemptionSchema = new mongoose.Schema({
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//     offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true },
//     referenceType: { type: String, enum: ['ride', 'rent'], required: true },
//     referenceId: { type: mongoose.Schema.Types.ObjectId, required: true }, // rideId or bookingId
//     discountAmount: { type: Number, required: true },
// }, { timestamps: true });

// module.exports = mongoose.model('OfferRedemption', offerRedemptionSchema);

const mongoose = require('mongoose');

const offerRedemptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true },
    referenceType: { type: String, enum: ['ride', 'rent', 'reward'], required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId, required: true }, // rideId or bookingId
    discountAmount: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('OfferRedemption', offerRedemptionSchema);




