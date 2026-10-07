const mongoose = require('mongoose');

/**
 * Dynamic Cancellation Policy (shown as radio options on the app's
 * "Cancel booking" screen, e.g. screen "13-cancel"). Admin can add, edit,
 * reorder, enable/disable or delete reasons — no app update required.
 */
const cancelReasonSchema = new mongoose.Schema(
    {
        reason: { type: String, required: true, trim: true },

        // Which module this reason applies to
        appliesTo: {
            type: String,
            enum: ['rent', 'ride', 'both'],
            default: 'both',
        },

        // Lower order shows first in the list
        order: { type: Number, default: 0 },

        isActive: { type: Boolean, default: true },

        // The app's UI always shows a free-text "Other" option at the end;
        // this flag lets admin mark exactly one reason as that special
        // "Other" row so it renders with a text box instead of a plain radio.
        isOther: { type: Boolean, default: false },
    },
    { timestamps: true }
);

cancelReasonSchema.index({ appliesTo: 1, order: 1 });

module.exports = mongoose.model('CancelReason', cancelReasonSchema);