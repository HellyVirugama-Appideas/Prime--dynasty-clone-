const mongoose = require('mongoose');

// "List your car as" screen — categories are admin-managed (dynamic).
// Ride/courier notifications are matched on driver.useFor === 'taxi' | 'bike'
// only, so any category that is NOT taxi/bike (rental, courier, or anything the
// admin adds later) never receives ride notifications.
const driverCategorySchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: [true, 'Key is required.'],
            unique: true,
            lowercase: true,
            trim: true, // stored in Driver.useFor, e.g. taxi / bike / rental / courier
        },
        en: { name: { type: String, required: true, trim: true } },
        fr: { name: { type: String, trim: true } },
        ar: { name: { type: String, trim: true } },
        image: String,
        // Which Vehicle Type list this category shows on the next screen
        typeFor: {
            type: String,
            enum: ['Taxi', 'Bike', 'Delivery', 'Rental'],
            required: true,
        },
        // ride = taxi/bike ride requests, rental = rent category, others = everything else
        group: { type: String, enum: ['ride', 'rental', 'others'], default: 'others' },
        sortOrder: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('DriverCategory', driverCategorySchema);