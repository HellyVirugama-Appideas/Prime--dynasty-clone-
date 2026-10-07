const mongoose = require('mongoose');

const chargesSchema = new mongoose.Schema({
    baseFare: { type: Number, required: true },
    minimumFare: { type: Number, required: true },
    bookingFee: { type: Number, required: true },
    carDeliveringFee: { type: Number, required: true },
    referralMinFare: { type: Number, default: 0 },      // minimum ride/rent fare jispar referral valid ho
    referralEarnValue: { type: Number, default: 0 },    // referrer ko kitna milega (flat amount)
});

module.exports = new mongoose.model('Charge', chargesSchema);
