require('dotenv').config();
const mongoose = require('mongoose');

const Booking = require('./models/bookingModel');
const BookingReq = require('./models/bookingReqModel');
const FareConfig = require('./models/fareConfigModel');
const Charges = require('./models/chargesModel');
const { getActiveFareConfig } = require('./utils/fareEngine');
const { buildFareBreakup } = require('./controllers/user/rentController');

// Paid bookings kabhi touch nahi hoti. Baaki sab dobara calculate hoti hain.
const filter = { paymentStatus: { $ne: 'completed' } };

const backfillModel = async (Model, label, fareConfig, charge) => {
    const docs = await Model.find(filter).populate('car');
    let done = 0;

    for (const doc of docs) {
        if (!doc.car) continue;

        const fareBreakup = buildFareBreakup({
            car: doc.car,
            fareConfig,
            charge,
            bookedFrom: doc.bookedFrom,
            bookedTo: doc.bookedTo,
            deliveryOption: doc.deliveryOption,
        });

        const update = { fareBreakup };
        if (label === 'Booking') update.price = fareBreakup.estimatedTotal;
        else update.amount = fareBreakup.estimatedTotal;

        await Model.updateOne({ _id: doc._id }, { $set: update });
        done++;
    }

    console.log(`${label}: ${done}/${docs.length} updated`);
};

(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const [fareConfig, charge] = await Promise.all([
        getActiveFareConfig(FareConfig),
        Charges.findOne(),
    ]);

    await backfillModel(BookingReq, 'BookingReq', fareConfig, charge);
    await backfillModel(Booking, 'Booking', fareConfig, charge);

    await mongoose.disconnect();
    console.log('✅ Backfill complete');
    process.exit(0);
})().catch(err => {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
});