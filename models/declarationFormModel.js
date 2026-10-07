const mongoose = require('mongoose');

/**
 * Dynamic Pickup / Return Declaration Form content — the numbered clauses
 * shown on screens "14-sign1" (Return declaration form) etc. before the
 * renter signs. Admin can edit the title + add/remove/reorder clauses for
 * each stage independently — no app update required.
 */
const clauseSchema = new mongoose.Schema(
    {
        text: { type: String, required: true, trim: true },
        order: { type: Number, default: 0 },
    },
    { _id: false }
);

const declarationFormSchema = new mongoose.Schema(
    {
        // One document per stage
        type: {
            type: String,
            enum: ['pickup', 'return'],
            required: true,
            unique: true,
        },

        title: { type: String, default: 'Declaration Form', trim: true },

        clauses: {
            type: [clauseSchema],
            default: [],
        },

        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('DeclarationForm', declarationFormSchema);