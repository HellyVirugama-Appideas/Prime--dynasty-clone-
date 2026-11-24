require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection
const connect = async () => {
    const mongoUri =
        process.env.MONGO_URI ||
        process.env.MONGODB_URI ||
        process.env.MONGO_URL ||
        process.env.DATABASE ||
        process.env.DATABASE_URL ||
        process.env.DB_URI;

    if (!mongoUri) {
        throw new Error('MongoDB URI not found in .env file');
    }

    await mongoose.connect(mongoUri);

    console.log('MongoDB connected successfully');
};


(async () => {
    await connect();
    console.log('DB connected:', mongoose.connection.name);

    const drivers = mongoose.connection.db.collection('drivers');

    console.log('Indexes (pehle):', (await drivers.indexes()).map(i => i.name));

    // 1) null / khali phone wale drivers se phone aur country_code hata do
    const cleaned = await drivers.updateMany(
        { $or: [{ phone: null }, { phone: '' }] },
        { $unset: { phone: '' } }
    );
    console.log('Phone field hataya (null/khali):', cleaned.modifiedCount);

    // 2) Purana phone index drop
    try {
        await drivers.dropIndex('phone_1');
        console.log('Purana phone_1 index drop ho gaya');
    } catch (e) {
        console.log('phone_1 drop skip:', e.message);
    }

    // 3) Naya partial unique index
    await drivers.createIndex(
        { phone: 1 },
        { unique: true, partialFilterExpression: { phone: { $type: 'string' } } }
    );

    console.log('Indexes (baad me):', (await drivers.indexes()).map(i => i.name));

    await mongoose.disconnect();
    process.exit(0);
})().catch(err => {
    console.error('❌ Script failed:', err.message);
    process.exit(1);
});