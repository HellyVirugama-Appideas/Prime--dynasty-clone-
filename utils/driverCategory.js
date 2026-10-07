const DriverCategory = require('../models/driverCategoryModel');

const DEFAULTS = [
    { key: 'taxi', en: { name: 'Taxi' }, fr: { name: 'Taxi' }, ar: { name: 'تاكسي' }, typeFor: 'Taxi', group: 'ride', sortOrder: 1 },
    { key: 'bike', en: { name: 'Bike' }, fr: { name: 'Moto' }, ar: { name: 'دراجة' }, typeFor: 'Bike', group: 'ride', sortOrder: 2 },
    { key: 'rental', en: { name: 'Rental' }, fr: { name: 'Location' }, ar: { name: 'إيجار' }, typeFor: 'Rental', group: 'rental', sortOrder: 3 },
    { key: 'courier', en: { name: 'Courier' }, fr: { name: 'Coursier' }, ar: { name: 'توصيل' }, typeFor: 'Delivery', group: 'others', sortOrder: 4 },
];

// First use on a fresh DB: seed the 4 default categories so the app never
// gets an empty screen. Admin can edit/disable/add more afterwards.
async function ensureDefaults() {
    // findOne exists in every mongoose version (count helpers differ between versions)
    if (!(await DriverCategory.findOne().lean())) {
        await DriverCategory.insertMany(DEFAULTS);
    }
}

async function getActiveCategories() {
    await ensureDefaults();
    return DriverCategory.find({ isActive: true }).sort('sortOrder createdAt');
}

async function findActiveCategory(key) {
    if (!key) return null;
    await ensureDefaults();
    return DriverCategory.findOne({ key: String(key).toLowerCase().trim(), isActive: true });
}

module.exports = { DEFAULTS, ensureDefaults, getActiveCategories, findActiveCategory };