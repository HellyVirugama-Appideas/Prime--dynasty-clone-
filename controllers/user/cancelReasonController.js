const CancelReason = require('../../models/cancelReasonModel');

// GET /api/cancel-reasons?type=rent|ride
// Public (no auth needed) — powers the "Cancel booking" screen's radio list.
// exports.getCancelReasons = async (req, res, next) => {
//     try {
//         const type = req.query.type === 'ride' ? 'ride' : 'rent'; // default: rent

//         const reasons = await CancelReason.find({
//             isActive: true,
//             appliesTo: { $in: [type, 'both'] },
//         })
//             .sort({ order: 1, createdAt: 1 })
//             .select('reason isOther order')
//             .lean();

//         res.json({
//             code: '1',
//             message: 'Cancellation reasons fetched successfully',
//             reasons: reasons.map((r) => ({
//                 id: r._id,
//                 reason: r.reason,
//                 isOther: r.isOther,
//             })),
//         });
//     } catch (error) {
//         next(error);
//     }
// };


// GET /api/cancel-reasons?type=ride|rent
exports.getCancelReasons = async (req, res, next) => {
    try {
        const type = (req.query.type || 'both').toLowerCase(); // ride | rent

        const filter = { isActive: true };
        if (type === 'ride') {
            filter.appliesTo = { $in: ['ride', 'both'] };
        } else if (type === 'rent') {
            filter.appliesTo = { $in: ['rent', 'both'] };
        }

        const reasons = await CancelReason.find(filter)
            .sort({ order: 1, createdAt: 1 })
            .select('reason appliesTo order isOther')
            .lean();

        res.json({
            code: '1',
            message: 'success',
            reasons,
        });
    } catch (error) {
        next(error);
    }
};