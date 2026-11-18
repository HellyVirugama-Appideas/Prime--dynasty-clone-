const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema(
    {
        driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true, index: true },
        name: { type: String, required: true, trim: true },
        subject: { type: String, required: true, trim: true },
        customSubject: { type: String, trim: true },       // subject = "Other" ho tab
        message: { type: String, required: true, trim: true },
        applicationStatus: String,                          // message bhejte time driver ka status
        status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('SupportMessage', supportMessageSchema);