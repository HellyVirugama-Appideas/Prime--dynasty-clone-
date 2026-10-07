// fixOffer.js
require('dotenv').config();
const mongoose = require('mongoose');
const Offer = require('./models/offerModel');

(async () => {
    await mongoose.connect(process.env.DATABASE || process.env.DB_URI); // apna .env ka DB connection variable naam check kar lo
    const result = await Offer.findByIdAndUpdate(
        '6aba0d6e88823813424bc84a',
        {
            offerType: 'progress',
            progressType: 'rides_in_period',
            periodType: 'month',
            targetCount: 20,
            rewardValue: 25,
            rewardType: 'wallet_credit',
        },
        { new: true }
    );
    console.log('Updated offer:', result);
    await mongoose.disconnect();
})();