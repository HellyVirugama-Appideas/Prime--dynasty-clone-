
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

// Main execution
(async () => {
    try {
        await connect();

        console.log('DB connected:', mongoose.connection.name);

        const users = mongoose.connection.db.collection('users');

        console.log(
            'Indexes (before):',
            (await users.indexes()).map(i => i.name)
        );

        // Remove null and empty email fields
        const cleaned = await users.updateMany(
            { $or: [{ email: null }, { email: '' }] },
            { $unset: { email: '' } }
        );

        console.log('Email fields removed:', cleaned.modifiedCount);

        // Drop old index
        try {
            await users.dropIndex('email_1');
            console.log('Old email_1 index dropped');
        } catch (e) {
            console.log('Index drop skipped:', e.message);
        }

        // Create new partial unique index
        await users.createIndex(
            { email: 1 },
            {
                unique: true,
                partialFilterExpression: {
                    email: { $type: 'string' }
                }
            }
        );

        console.log('New partial unique index created');

        console.log(
            'Indexes (after):',
            (await users.indexes()).map(i => i.name)
        );

        console.log('Script completed successfully');

    } catch (err) {
        console.error('Script failed:', err.message);
        process.exitCode = 1;

    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
})();
