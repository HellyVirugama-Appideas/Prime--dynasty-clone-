const Wallet = require('../../models/wallet');
const Driver = require('../../models/driverModel');
const withdrawalService = require('../../services/withdrawalService');
const mongoose = require('mongoose');

/**
 * GET /admin/withdrawals
 * List all withdrawal requests with filters
 */
exports.getWithdrawalRequests = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;
        const filterStatus = req.query.status || 'all';

        const query = { type: 'withdrawal' };
        if (filterStatus !== 'all') {
            query.status = filterStatus;
        }

        const [withdrawals, total, summaryStats] = await Promise.all([
            Wallet.find(query)
                .populate('driverId', 'name email phone stripeConnectAccountId stripePayoutsEnabled')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Wallet.countDocuments(query),

            // Summary aggregation
            Wallet.aggregate([
                { $match: { type: 'withdrawal' } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$amount' },
                        totalNet: { $sum: '$netAmount' },
                    },
                },
            ]),
        ]);

        // Build summary object
        const summary = { pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0 };
        const amounts = { pending: 0, completed: 0 };
        summaryStats.forEach(s => {
            summary[s._id] = s.count;
            if (s._id === 'pending') amounts.pending = s.totalAmount;
            if (s._id === 'completed') amounts.completed = s.totalNet;
        });

        const formattedWithdrawals = withdrawals.map(w => ({
            ...w,
            formattedAmount: (w.amount / 100).toFixed(2),
            formattedNet: w.netAmount ? (w.netAmount / 100).toFixed(2) : '0.00',
            formattedFee: w.processingFee ? (w.processingFee / 100).toFixed(2) : '0.00',
        }));

        res.render('withdrawalRequests', {
            title: 'Dynasty Admin',
            withdrawals: formattedWithdrawals,
            filterStatus,
            summary,
            pendingAmount: (amounts.pending / 100).toFixed(2),
            completedAmount: (amounts.completed / 100).toFixed(2),
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total,
        });
    } catch (error) {
        console.error('Admin getWithdrawalRequests error:', error);
        req.flash('red', error.message);
        res.redirect('/admin');
    }
};

/**
 * POST /admin/withdrawals/:id/approve
 * Process (approve) a pending withdrawal — triggers Stripe transfer
 */
// exports.approveWithdrawal = async (req, res) => {
//     try {
//         const { id } = req.params;

//         if (!mongoose.Types.ObjectId.isValid(id)) {
//             req.flash('red', 'Invalid withdrawal ID');
//             return res.redirect('/admin/withdrawals');
//         }

//         const withdrawal = await Wallet.findOne({ _id: id, type: 'withdrawal' });
//         if (!withdrawal) {
//             req.flash('red', 'Withdrawal not found');
//             return res.redirect('/admin/withdrawals');
//         }

//         if (withdrawal.status !== 'pending') {
//             req.flash('red', `Cannot approve a withdrawal with status: ${withdrawal.status}`);
//             return res.redirect('/admin/withdrawals');
//         }

//         await withdrawalService.processWithdrawal(id);

//         req.flash('green', 'Withdrawal approved and transfer initiated successfully');
//         res.redirect('/admin/withdrawals');
//     } catch (error) {
//         console.error('Admin approveWithdrawal error:', error);
//         req.flash('red', `Approval failed: ${error.message}`);
//         res.redirect('/admin/withdrawals');
//     }
// };


exports.approveWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            req.flash('red', 'Invalid withdrawal ID');
            return res.redirect('/admin/withdrawals');
        }

        const withdrawal = await Wallet.findOne({ _id: id, type: 'withdrawal' });
        if (!withdrawal) {
            req.flash('red', 'Withdrawal not found');
            return res.redirect('/admin/withdrawals');
        }

        if (withdrawal.status !== 'pending') {
            req.flash('red', `Cannot approve: status is already "${withdrawal.status}"`);
            return res.redirect('/admin/withdrawals');
        }

        // Driver ka Stripe account check karo pehle
        const driver = await Driver.findById(withdrawal.driverId)
            .select('stripeConnectAccountId stripePayoutsEnabled name');

        if (!driver) {
            req.flash('red', 'Driver not found');
            return res.redirect('/admin/withdrawals');
        }

        if (!driver.stripeConnectAccountId) {
            req.flash('red', `Driver "${driver.name}" has no Stripe account linked`);
            return res.redirect('/admin/withdrawals');
        }

        if (!driver.stripePayoutsEnabled) {
            req.flash('red', `Driver "${driver.name}" Stripe payouts are not enabled yet`);
            return res.redirect('/admin/withdrawals');
        }

        // ✅ Yeh call karte hi — status processing hoga, balance cut dikhega
        await withdrawalService.processWithdrawal(id);

        req.flash('green', `Withdrawal of ₹${(withdrawal.amount / 100).toFixed(2)} approved and transferred successfully`);
        res.redirect('/admin/withdrawals');

    } catch (error) {
        console.error('Admin approveWithdrawal error:', error);
        req.flash('red', `Approval failed: ${error.message}`);
        res.redirect('/admin/withdrawals');
    }
};

/**
 * POST /admin/withdrawals/:id/reject
 * Reject (cancel) a pending withdrawal with reason
 */
exports.rejectWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            req.flash('red', 'Invalid withdrawal ID');
            return res.redirect('/admin/withdrawals');
        }

        const withdrawal = await Wallet.findOne({ _id: id, type: 'withdrawal' });
        if (!withdrawal) {
            req.flash('red', 'Withdrawal not found');
            return res.redirect('/admin/withdrawals');
        }

        if (withdrawal.status !== 'pending') {
            req.flash('red', `Cannot reject a withdrawal with status: ${withdrawal.status}`);
            return res.redirect('/admin/withdrawals');
        }

        await withdrawalService.cancelWithdrawal(id, reason || 'Rejected by admin');

        // Re-credit the fee back to driver wallet if applicable
        if (withdrawal.processingFee > 0) {
            // Remove the corresponding withdrawal_fee record
            await Wallet.findOneAndDelete({
                driverId: withdrawal.driverId,
                type: 'withdrawal_fee',
                description: { $regex: withdrawal._id.toString() },
            });
        }

        req.flash('green', 'Withdrawal rejected and driver notified');
        res.redirect('/admin/withdrawals');
    } catch (error) {
        console.error('Admin rejectWithdrawal error:', error);
        req.flash('red', `Rejection failed: ${error.message}`);
        res.redirect('/admin/withdrawals');
    }
};

/**
 * GET /admin/withdrawals/:id  (JSON — for modal detail view)
 */
exports.getWithdrawalDetail = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid ID' });
        }

        const withdrawal = await Wallet.findOne({ _id: id, type: 'withdrawal' })
            .populate('driverId', 'name email phone stripeConnectAccountId stripePayoutsEnabled approved blocked')
            .lean();

        if (!withdrawal) {
            return res.status(404).json({ error: 'Not found' });
        }

        res.json({
            ...withdrawal,
            formattedAmount: (withdrawal.amount / 100).toFixed(2),
            formattedNet: withdrawal.netAmount ? (withdrawal.netAmount / 100).toFixed(2) : '0.00',
            formattedFee: withdrawal.processingFee ? (withdrawal.processingFee / 100).toFixed(2) : '0.00',
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};