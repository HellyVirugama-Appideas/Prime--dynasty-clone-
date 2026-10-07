// const CancelReason = require('../../models/cancelReasonModel');
// const createError = require('http-errors');

// // GET - Cancellation Policy Page (list + add/edit)
// exports.getCancelReasons = async (req, res) => {
//     try {
//         const reasons = await CancelReason.find().sort({ appliesTo: 1, order: 1, createdAt: 1 });

//         res.render('cancelReasons', {
//             title: 'Cancellation Policy',
//             reasons,
//             url: req.originalUrl,

//         });
//     } catch (error) {
//         req.flash('red', error.message);
//         res.redirect('/admin');
//     }
// };

// // POST - Add a new cancellation reason
// exports.addCancelReason = async (req, res) => {
//     try {
//         const { reason, appliesTo, order, isOther } = req.body;

//         if (!reason || !reason.trim()) {
//             req.flash('red', 'Reason text is required.');
//             return res.redirect('/admin/cancel-reasons');
//         }

//         await CancelReason.create({
//             reason: reason.trim(),
//             appliesTo: ['rent', 'ride', 'both'].includes(appliesTo) ? appliesTo : 'both',
//             order: parseInt(order) || 0,
//             isOther: !!isOther,
//             isActive: true,
//         });

//         req.flash('green', 'Cancellation reason added successfully.');
//         res.redirect('/admin/cancel-reasons');
//     } catch (error) {
//         req.flash('red', error.message);
//         res.redirect('/admin/cancel-reasons');
//     }
// };

// // POST - Update an existing cancellation reason
// exports.updateCancelReason = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { reason, appliesTo, order, isOther } = req.body;

//         if (!reason || !reason.trim()) {
//             req.flash('red', 'Reason text is required.');
//             return res.redirect('/admin/cancel-reasons');
//         }

//         const updated = await CancelReason.findByIdAndUpdate(
//             id,
//             {
//                 reason: reason.trim(),
//                 appliesTo: ['rent', 'ride', 'both'].includes(appliesTo) ? appliesTo : 'both',
//                 order: parseInt(order) || 0,
//                 isOther: !!isOther,
//             },
//             { new: true }
//         );

//         if (!updated) {
//             req.flash('red', 'Reason not found.');
//             return res.redirect('/admin/cancel-reasons');
//         }

//         req.flash('green', 'Cancellation reason updated successfully.');
//         res.redirect('/admin/cancel-reasons');
//     } catch (error) {
//         if (error.name === 'CastError') {
//             req.flash('red', 'Invalid reason id.');
//         } else {
//             req.flash('red', error.message);
//         }
//         res.redirect('/admin/cancel-reasons');
//     }
// };

// // POST - Toggle active/inactive (enable/disable without deleting)
// exports.toggleCancelReason = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const reason = await CancelReason.findById(id);

//         if (!reason) {
//             req.flash('red', 'Reason not found.');
//             return res.redirect('/admin/cancel-reasons');
//         }

//         reason.isActive = !reason.isActive;
//         await reason.save();

//         req.flash('green', `Reason ${reason.isActive ? 'enabled' : 'disabled'} successfully.`);
//         res.redirect('/admin/cancel-reasons');
//     } catch (error) {
//         req.flash('red', error.message);
//         res.redirect('/admin/cancel-reasons');
//     }
// };

// // POST - Delete a cancellation reason
// exports.deleteCancelReason = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const deleted = await CancelReason.findByIdAndDelete(id);

//         if (!deleted) {
//             req.flash('red', 'Reason not found.');
//             return res.redirect('/admin/cancel-reasons');
//         }

//         req.flash('green', 'Cancellation reason deleted successfully.');
//         res.redirect('/admin/cancel-reasons');
//     } catch (error) {
//         req.flash('red', error.message);
//         res.redirect('/admin/cancel-reasons');
//     }
// };


const CancelReason = require('../../models/cancelReasonModel');
const createError = require('http-errors');

// GET - Cancellation Policy Page (Ride + Rent separate)
exports.getCancelReasons = async (req, res) => {
    try {
        const reasons = await CancelReason.find().sort({ order: 1, createdAt: 1 });

        const rideReasons = reasons.filter(r => r.appliesTo === 'ride' || r.appliesTo === 'both');
        const rentReasons = reasons.filter(r => r.appliesTo === 'rent' || r.appliesTo === 'both');

        res.render('cancelReasons', {
            title: 'Cancellation Policy',
            rideReasons,
            rentReasons,
            url: req.originalUrl,
        });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin');
    }
};

// POST - Add a new cancellation reason
exports.addCancelReason = async (req, res) => {
    try {
        const { reason, appliesTo, order, isOther } = req.body;

        if (!reason || !reason.trim()) {
            req.flash('red', 'Reason text is required.');
            return res.redirect('/admin/cancel-reasons');
        }

        const validApplies = ['rent', 'ride', 'both'].includes(appliesTo) ? appliesTo : 'both';

        await CancelReason.create({
            reason: reason.trim(),
            appliesTo: validApplies,
            order: parseInt(order) || 0,
            isOther: !!isOther,
            isActive: true,
        });

        req.flash('green', 'Cancellation reason added successfully.');
        res.redirect('/admin/cancel-reasons');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/cancel-reasons');
    }
};

// POST - Update an existing cancellation reason
exports.updateCancelReason = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, appliesTo, order, isOther } = req.body;

        if (!reason || !reason.trim()) {
            req.flash('red', 'Reason text is required.');
            return res.redirect('/admin/cancel-reasons');
        }

        const updated = await CancelReason.findByIdAndUpdate(
            id,
            {
                reason: reason.trim(),
                appliesTo: ['rent', 'ride', 'both'].includes(appliesTo) ? appliesTo : 'both',
                order: parseInt(order) || 0,
                isOther: !!isOther,
            },
            { new: true }
        );

        if (!updated) {
            req.flash('red', 'Reason not found.');
            return res.redirect('/admin/cancel-reasons');
        }

        req.flash('green', 'Cancellation reason updated successfully.');
        res.redirect('/admin/cancel-reasons');
    } catch (error) {
        if (error.name === 'CastError') {
            req.flash('red', 'Invalid reason id.');
        } else {
            req.flash('red', error.message);
        }
        res.redirect('/admin/cancel-reasons');
    }
};

// POST - Toggle active/inactive
exports.toggleCancelReason = async (req, res) => {
    try {
        const { id } = req.params;
        const reason = await CancelReason.findById(id);

        if (!reason) {
            req.flash('red', 'Reason not found.');
            return res.redirect('/admin/cancel-reasons');
        }

        reason.isActive = !reason.isActive;
        await reason.save();

        req.flash('green', `Reason ${reason.isActive ? 'enabled' : 'disabled'} successfully.`);
        res.redirect('/admin/cancel-reasons');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/cancel-reasons');
    }
};

// POST - Delete
exports.deleteCancelReason = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await CancelReason.findByIdAndDelete(id);

        if (!deleted) {
            req.flash('red', 'Reason not found.');
            return res.redirect('/admin/cancel-reasons');
        }

        req.flash('green', 'Cancellation reason deleted successfully.');
        res.redirect('/admin/cancel-reasons');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/cancel-reasons');
    }
};