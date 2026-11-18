const mongoose = require('mongoose');

const onboardingScreenSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true, default: '' },
        image: { type: String, required: true }, // /uploads/xxxx.png
        order: { type: Number, default: 0, index: true }, // chhota number pehle dikhega
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('OnboardingScreen', onboardingScreenSchema);