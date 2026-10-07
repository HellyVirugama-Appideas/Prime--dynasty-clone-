const createError = require('http-errors');
const Wallet = require('../../models/wallet');
const Driver = require('../../models/driverModel');
const withdrawalService = require('../../services/withdrawalService');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Ride = require('../../models/rideModel');
const Transaction = require('../../models/transaction');


// "5.2 km" / "3 mi" / "850 m" / "5.2" -> km (number)
const parseDistanceKm = (value) => {
    if (value === undefined || value === null) return 0;
    const str = String(value).toLowerCase().replace(/,/g, '');
    const num = parseFloat(str);
    if (!Number.isFinite(num)) return 0;
    if (/\b(mi|mile|miles)\b/.test(str)) return num * 1.609344;
    if (/\d\s*m(?!i)\b/.test(str) && !/km/.test(str)) return num / 1000; // metres
    return num; // km (default)
};
 
// "12 mins" / "1 hr 5 mins" / "1h 05m" / "00:45" / "45" -> minutes (number)
const parseDurationMinutes = (value) => {
    if (value === undefined || value === null) return 0;
    const str = String(value).toLowerCase().trim();
    if (!str) return 0;
 
    const clock = str.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
    if (clock) {
        return Number(clock[1]) * 60 + Number(clock[2]) + Number(clock[3] || 0) / 60;
    }
 
    const hours = str.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/);
    const mins = str.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/);
    if (hours || mins) {
        return (hours ? parseFloat(hours[1]) * 60 : 0) + (mins ? parseFloat(mins[1]) : 0);
    }
 
    const plain = parseFloat(str); // sirf number -> minutes
    return Number.isFinite(plain) ? plain : 0;
};
 
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
 
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
 
// Date filter dropdown: filter = today | yesterday | week | month | custom
//   today     -> aaj
//   yesterday -> kal
//   week      -> pichhle 7 din (aaj tak)           e.g. "This Week, 10-16 Feb"
//   month     -> mahine ki 1 tarikh se aaj tak      e.g. "This Month, 1-16 Feb"
//   custom    -> startDate + endDate (YYYY-MM-DD)   e.g. "1 Jan 2026 - 16 Feb 2026"
// `filter` na do to purana tareeka chalta hai: date / startDate / endDate, kuch nahi to aaj.
// tzOffset (minutes, India = 330) ho to us timezone ka din, warna server ka local din.
// Galat input par null return hota hai.
const getDateRange = ({ filter, date, startDate, endDate, tzOffset }) => {
    const tz =
        tzOffset !== undefined && tzOffset !== '' && Number.isFinite(Number(tzOffset))
            ? Number(tzOffset)
            : null;
 
    const parseYmd = (str) => {
        const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(str).trim());
        if (!m) return null;
        const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
        if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
        return { y, mo, d };
    };
 
    const toParts = (ms) => {
        const d = new Date(ms);
        return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate() };
    };
    const addDays = (p, n) => toParts(Date.UTC(p.y, p.mo - 1, p.d) + n * 86400000);
    const pad = (n) => String(n).padStart(2, '0');
    const ymd = (p) => `${p.y}-${pad(p.mo)}-${pad(p.d)}`;
    const short = (p) => `${p.d} ${MONTHS[p.mo - 1]}`;
 
    const startOfDay = ({ y, mo, d }) =>
        tz !== null
            ? new Date(Date.UTC(y, mo - 1, d) - tz * 60000)
            : new Date(y, mo - 1, d, 0, 0, 0, 0);
    const endOfDay = ({ y, mo, d }) =>
        tz !== null
            ? new Date(Date.UTC(y, mo - 1, d) - tz * 60000 + 86400000 - 1)
            : new Date(y, mo - 1, d, 23, 59, 59, 999);
 
    const now = new Date();
    const today =
        tz !== null ? toParts(Date.now() + tz * 60000)
            : { y: now.getFullYear(), mo: now.getMonth() + 1, d: now.getDate() };
 
    let type = String(filter || '').toLowerCase().replace(/[\s_-]/g, '');
    let f, t;
 
    if (type === 'today') {
        f = t = today;
    } else if (type === 'yesterday') {
        f = t = addDays(today, -1);
    } else if (type === 'week' || type === 'thisweek') {
        type = 'week';
        f = addDays(today, -6);
        t = today;
    } else if (type === 'month' || type === 'thismonth') {
        type = 'month';
        f = { y: today.y, mo: today.mo, d: 1 };
        t = today;
    } else if (type === 'custom' || !type) {
        const from = startDate || date;
        const to = endDate || date || startDate;
        if (!from && !to) {
            if (type === 'custom') return null; // custom me dates zaroori hain
            type = 'today';
            f = t = today;
        } else {
            f = parseYmd(from || to);
            t = parseYmd(to || from);
            if (!f || !t) return null;
            type = 'custom';
        }
    } else {
        return null; // unknown filter
    }
 
    const start = startOfDay(f);
    const end = endOfDay(t);
    if (start > end) return null;
 
    let title;
    if (type === 'today') title = `Today, ${short(f)}`;
    else if (type === 'yesterday') title = `Yesterday ${short(f)}`;
    else if (type === 'week')
        title = f.mo === t.mo
            ? `This Week, ${f.d}-${t.d} ${MONTHS[t.mo - 1]}`
            : `This Week, ${short(f)}-${short(t)}`;
    else if (type === 'month') title = `This Month, 1-${t.d} ${MONTHS[t.mo - 1]}`;
    else title = `${short(f)} ${f.y} - ${short(t)} ${t.y}`;
 
    return { start, end, type, title, fromDate: ymd(f), toDate: ymd(t) };
};
 
// Selected range ki trips / km / hours / earning
const getDayStats = async (driverId, start, end) => {
    const [rides, earningAgg] = await Promise.all([
        // Completed rides jo is range me complete hui (completedAt na ho to createdAt)
        Ride.find({
            driver: driverId,
            status: 'Completed',
            $or: [
                { completedAt: { $gte: start, $lte: end } },
                { completedAt: null, createdAt: { $gte: start, $lte: end } },
            ],
        }).select('distance time'),
 
        // Earning = driver wallet me credit hui (commission ke baad) amount
        Wallet.aggregate([
            {
                $match: {
                    driverId: new mongoose.Types.ObjectId(driverId),
                    type: 'add',
                    status: 'completed',
                    createdAt: { $gte: start, $lte: end },
                },
            },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$netAmount', '$amount'] } } } },
        ]),
    ]);
 
    const totalKm = rides.reduce((sum, r) => sum + parseDistanceKm(r.distance), 0);
    const totalMinutes = Math.round(
        rides.reduce((sum, r) => sum + parseDurationMinutes(r.time), 0)
    );
 
    const hh = Math.floor(totalMinutes / 60);
    const mm = totalMinutes % 60;
 
    return {
        trips: rides.length,
        totalKm: Number(totalKm.toFixed(2)),
        totalMinutes,
        totalHours: Number((totalMinutes / 60).toFixed(2)),
        totalHoursText: `${hh}h ${String(mm).padStart(2, '0')}m`,
        earnings: Number((((earningAgg[0] && earningAgg[0].total) || 0) / 100).toFixed(2)),
    };
};
 
 

/**
 * Get driver's wallet balance and transaction history
 */
// exports.getWalletBalance = async (req, res, next) => {
//     try {
//         const { page = 1, limit = 20 } = req.query;
//         const skip = (page - 1) * limit;

//         // Get current wallet balance
//         const availableBalance = await Wallet.calculateAvailableBalance(req.driver._id);

//         // 🔥 Safe Query: Sirf withdrawal aur non-withdrawal_fee transactions dikhaye
//         // withdrawal_fee ko hide kiya, baaki sab "Received" mein aayenge
//         const query = {
//             driverId: req.driver._id,
//             type: { $ne: 'withdrawal_fee' }   // only withdrawal_fee ko exclude
//         };

//         const transactions = await Wallet.find(query)
//             .sort({ createdAt: -1 })
//             .skip(skip)
//             .limit(parseInt(limit))
//             .populate('rideId', 'pickupAddress endAddress price')
//             .populate('bookingId', 'address price bookedFrom bookedTo')
//             .select('-__v');

//         const total = await Wallet.countDocuments(query);

//         // Get pending withdrawals amount
//         const pendingWithdrawals = await Wallet.getPendingWithdrawals(req.driver._id);
//         const pendingAmount = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);

//         const formattedTransactions = transactions.map(t => {
//             const isWithdrawal = t.type === 'withdrawal';

//             return {
//                 ...t.toObject(),
//                 formattedAmount: t.amount / 100,
                
//                 // Ride, booking, refund sab ke liye netAmount dikhaye (agar null ho to amount use karo)
//                 formattedNetAmount: t.netAmount 
//                     ? t.netAmount / 100 
//                     : (isWithdrawal ? null : t.amount / 100),

//                 // Type field as per your requirement
//                 type: isWithdrawal ? 'Withdraw' : 'Received',

//                 // Status for better UX (especially pending withdrawals)
//                 status: t.status || 'completed',
//             };
//         });

//         res.json({
//             code: '1',
//             message: req.t('success'),
//             balance: availableBalance / 100,
//             pendingWithdrawals: pendingAmount / 100,
//             canWithdraw: req.driver.canWithdraw(),
//             withdrawalSettings: req.driver.withdrawalSettings,
//             transactions: formattedTransactions,
//             pagination: {
//                 currentPage: parseInt(page),
//                 totalPages: Math.ceil(total / limit),
//                 totalTransactions: total,
//                 hasMore: skip + transactions.length < total,
//             },
//         });
//     } catch (error) {
//         console.error('Get wallet balance error:', error);
//         next(error);
//     }
// };


// ---------------------------------------------------------------------
// STEP 3 — UPDATED: getWalletBalance (purane ko isse replace karo)
// ---------------------------------------------------------------------
exports.getWalletBalance = async (req, res, next) => {
    try {
        // Route POST hai (form-data body), isliye body + query dono se params lo
        const params = { ...(req.body || {}), ...(req.query || {}) };
 
        const page = Math.max(parseInt(params.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(params.limit) || 20, 1), 100);
        const skip = (page - 1) * limit;
        const search = String(params.search || '').trim();
 
        // ✅ Date filter (default = aaj)
        const range = getDateRange(params);
        if (!range) {
            return next(
                createError.BadRequest(
                    'Invalid date filter. filter = today | yesterday | week | month | custom ' +
                    '(custom needs startDate & endDate as YYYY-MM-DD, startDate <= endDate).'
                )
            );
        }
        const { start, end } = range;
 
        // Current wallet balance (overall, date se independent)
        const availableBalance = await Wallet.calculateAvailableBalance(req.driver._id);
 
        // Transactions query: date range + withdrawal_fee hidden
        const query = {
            driverId: req.driver._id,
            type: { $ne: 'withdrawal_fee' },
            createdAt: { $gte: start, $lte: end },
        };
 
        // ✅ Search: description, ride ka pickup/drop address, ya amount
        if (search) {
            const rx = new RegExp(escapeRegex(search), 'i');
 
            const matchedRides = await Ride.find({
                driver: req.driver._id,
                $or: [{ pickupAddress: rx }, { endAddress: rx }],
            }).select('_id');
 
            const or = [
                { description: rx },
                { rideId: { $in: matchedRides.map((r) => r._id) } },
            ];
 
            const num = parseFloat(search);
            if (Number.isFinite(num)) {
                const cents = Math.round(num * 100);
                or.push({ amount: cents }, { netAmount: cents });
            }
 
            query.$or = or;
        }
 
        const [transactions, total, pendingWithdrawals, dayStats] = await Promise.all([
            Wallet.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('rideId', 'pickupAddress endAddress price')
                .populate('bookingId', 'address price bookedFrom bookedTo')
                .select('-__v'),
            Wallet.countDocuments(query),
            Wallet.getPendingWithdrawals(req.driver._id),
            getDayStats(req.driver._id, start, end),
        ]);
 
        const pendingAmount = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
 
        const formattedTransactions = transactions.map((t) => {
            const isWithdrawal = t.type === 'withdrawal';
 
            return {
                ...t.toObject(),
                formattedAmount: t.amount / 100,
 
                // Ride, booking, refund sab ke liye netAmount dikhaye (agar null ho to amount use karo)
                formattedNetAmount: t.netAmount
                    ? t.netAmount / 100
                    : isWithdrawal
                    ? null
                    : t.amount / 100,
 
                type: isWithdrawal ? 'Withdraw' : 'Received',
                status: t.status || 'completed',
            };
        });
 
        res.json({
            code: '1',
            message: req.t('success'),
            balance: availableBalance / 100,
            pendingWithdrawals: pendingAmount / 100,
            canWithdraw: req.driver.canWithdraw(),
            withdrawalSettings: req.driver.withdrawalSettings,
 
            // ✅ selected din / range ki stats (date na do to aaj ki)
            dayStats,
            todayStats: dayStats, // purane app ke liye same data (alias)
 
            // ✅ Date title (screen ke upar dikhane ke liye) + applied filter
            dateTitle: range.title,
            filter: {
                type: range.type, // today | yesterday | week | month | custom
                title: range.title,
                fromDate: range.fromDate,
                toDate: range.toDate,
                from: start,
                to: end,
                search: search || null,
            },
 
            transactions: formattedTransactions,
            pagination: {
                currentPage: page,
                limit,
                totalPages: Math.ceil(total / limit),
                totalTransactions: total,
                hasMore: skip + transactions.length < total,
            },
        });
    } catch (error) {
        console.error('Get wallet balance error:', error);
        next(error);
    }
};
 
// Credit / Debit ke hisaab se Wallet types
const CREDIT_TYPES = ['add'];
const DEBIT_TYPES = ['withdrawal', 'withdrawal_fee', 'use'];

/**
 * Get driver's transaction history with filters
 */
// exports.getTransactionHistory = async (req, res, next) => {
//     try {
//         const { page = 1, limit = 20, type, status, startDate, endDate } = req.query;
//         const skip = (page - 1) * limit;

//         const query = { driverId: req.driver._id };
//         if (type) query.type = type;
//         if (status) query.status = status;
//         if (startDate || endDate) {
//             query.createdAt = {};
//             if (startDate) query.createdAt.$gte = new Date(startDate);
//             if (endDate) query.createdAt.$lte = new Date(endDate);
//         }

//         const [transactions, total] = await Promise.all([
//             Wallet.find(query)
//                 .sort({ createdAt: -1 })
//                 .skip(skip)
//                 .limit(parseInt(limit))
//                 .populate('rideId', 'pickupAddress endAddress price')
//                 .populate('bookingId', 'address price bookedFrom bookedTo')
//                 .select('-__v'),
//             Wallet.countDocuments(query),
//         ]);

//         const formattedTransactions = transactions.map(t => ({
//             ...t.toObject(),
//             formattedAmount: t.amount / 100,
//             formattedNetAmount: t.netAmount ? t.netAmount / 100 : null,
//             formattedFee: t.processingFee ? t.processingFee / 100 : null,
//         }));

//         res.json({
//             code: '1',
//             message: req.t('success'),
//             transactions: formattedTransactions,
//             pagination: {
//                 currentPage: parseInt(page),
//                 totalPages: Math.ceil(total / limit),
//                 totalTransactions: total,
//                 hasMore: skip + transactions.length < total,
//             },
//         });
//     } catch (error) {
//         console.error('Get transaction history error:', error);
//         next(error);
//     }
// };

 
// "rent car" / "rent_car" / "Rent-Car" -> "rentcar"
const txNorm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
 
// "rent car" / "ride_payment" -> "Rent Car" / "Ride Payment"
const txLabel = (s) =>
    String(s)
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
 
// Input ko valid types se match karo (pehle exact, phir shuruaat se: "ride" -> "ride_payment")
const resolveTypes = (input, validTypes) => {
    const n = txNorm(input);
    if (!n) return [];
    const exact = validTypes.filter((v) => txNorm(v) === n);
    if (exact.length) return exact;
    return validTypes.filter((v) => txNorm(v).startsWith(n));
};
 
/**
 * Get driver's transaction history with filters
 */
exports.getTransactionHistory = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, startDate, endDate } = req.query;
        const rawType = String(req.query.type || '').trim();
        const search = String(req.query.search || '').trim();
        const flowFilter = String(req.query.filter || 'all').toLowerCase().trim();
        const skip = (page - 1) * limit;
 
        if (!['all', 'credit', 'debit'].includes(flowFilter))
            return next(createError.BadRequest('filter must be one of: all, credit, debit'));
 
        const query = { driverId: req.driver._id };
        const andConds = [];
 
        // ✅ Valid types (dynamic):
        //   walletTypes -> Wallet.type (model enum + is driver ki entries)
        //   sourceTypes -> Transaction.type enum (ride_payment, bike, rent car, ...)
        const walletTypes = [
            ...new Set([
                ...(Wallet.schema.path('type').enumValues || []),
                ...(await Wallet.distinct('type', { driverId: req.driver._id })).filter(Boolean),
            ]),
        ];
        const sourceTypes = Transaction.schema.path('type').enumValues || [];
 
        // ✅ type filter
        if (rawType && txNorm(rawType) !== 'all') {
            const walletMatched = resolveTypes(rawType, walletTypes);
            const sourceMatched = resolveTypes(rawType, sourceTypes);
 
            if (!walletMatched.length && !sourceMatched.length) {
                const allowed = [...new Set([...walletTypes, ...sourceTypes])];
                return next(
                    createError.BadRequest(`type must be one of: all, ${allowed.join(', ')}`)
                );
            }
 
            const typeOr = [];
            if (walletMatched.length) typeOr.push({ type: { $in: walletMatched } });
            sourceMatched.forEach((v) => {
                // rent type -> bookingId wali entries, baaki (ride_payment, bike) -> rideId wali
                typeOr.push(
                    txNorm(v).includes('rent')
                        ? { bookingId: { $exists: true, $ne: null } }
                        : { rideId: { $exists: true, $ne: null } }
                );
            });
            andConds.push({ $or: typeOr });
        }
 
        // ✅ All / Credit / Debit filter
        if (flowFilter === 'debit') andConds.push({ type: { $in: DEBIT_TYPES } });
        else if (flowFilter === 'credit') andConds.push({ type: { $nin: DEBIT_TYPES } });
 
        if (andConds.length) query.$and = andConds;
 
        if (status) query.status = status;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }
 
        // ✅ Search: description, ride ka pickup/drop address, ya amount
        if (search) {
            const rx = new RegExp(escapeRegex(search), 'i');
 
            const matchedRides = await Ride.find({
                driver: req.driver._id,
                $or: [{ pickupAddress: rx }, { endAddress: rx }],
            }).select('_id');
 
            const or = [
                { description: rx },
                { rideId: { $in: matchedRides.map((r) => r._id) } },
            ];
 
            const num = parseFloat(search);
            if (Number.isFinite(num)) {
                const cents = Math.round(num * 100);
                or.push({ amount: cents }, { netAmount: cents });
            }
 
            query.$or = or;
        }
 
        const [transactions, total] = await Promise.all([
            Wallet.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('rideId', 'pickupAddress endAddress price')
                .populate('bookingId', 'address price bookedFrom bookedTo')
                .select('-__v'),
            Wallet.countDocuments(query),
        ]);
 
        const formattedTransactions = transactions.map(t => {
            const isDebit = DEBIT_TYPES.includes(t.type);
 
            return {
                ...t.toObject(),
                walletType: t.type, // asli Wallet type (add / withdrawal / ...), agar app ko chahiye
                flow: isDebit ? 'debit' : 'credit',
 
                // ✅ App ke liye display type: credit -> "Received", debit -> "Withdraw"
                type: isDebit ? 'Withdraw' : 'Received',
 
                formattedAmount: t.amount / 100,
                formattedNetAmount: t.netAmount ? t.netAmount / 100 : null,
                formattedFee: t.processingFee ? t.processingFee / 100 : null,
            };
        });
 
        // App ke type chips ke liye (dynamic): [{ key, label }]
        const availableTypes = [
            { key: 'all', label: 'All' },
            ...[...new Set([...walletTypes, ...sourceTypes])].map((v) => ({
                key: v,
                label: txLabel(v),
            })),
        ];
 
        res.json({
            code: '1',
            message: req.t('success'),
            filter: flowFilter,
            availableTypes,
            transactions: formattedTransactions,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalTransactions: total,
                hasMore: skip + transactions.length < total,
            },
        });
    } catch (error) {
        console.error('Get transaction history error:', error);
        next(error);
    }
};

 
 
/**
 * Get Stripe Connect onboarding link
 */
exports.getOnboardingLink = async (req, res, next) => {
    try {
        const accountLink = await withdrawalService.generateOnboardingLink(req.driver._id);

        res.json({
            code: '1',
            message: req.t('success'),
            onboardingUrl: accountLink.url,
        });
    } catch (error) {
        console.error('Get onboarding link error:', error);
        next(error);
    }
};

/**
 * Update Stripe Connect account status
 */
exports.updateAccountStatus = async (req, res, next) => {
    try {
        if (!req.driver.stripeConnectAccountId) {
            return next(createError.BadRequest('No Stripe account found'));
        }

        const { account, driver } = await withdrawalService.updateAccountStatus(
            req.driver.stripeConnectAccountId
        );

        res.json({
            code: '1',
            message: req.t('success'),
            accountStatus: {
                detailsSubmitted: account.details_submitted,
                payoutsEnabled: account.payouts_enabled,
                chargesEnabled: account.charges_enabled,
                onboardingCompleted: driver.stripeOnboardingCompleted,
            },
        });
    } catch (error) {
        console.error('Update account status error:', error);
        next(error);
    }
};

/**
 * Create withdrawal request
 */
// exports.createWithdrawalRequest = async (req, res, next) => {
//     try {
//         // Validate request
//         const errors = validationResult(req);
//         if (!errors.isEmpty()) {
//             return res.status(400).json({
//                 code: '0',
//                 message: 'Validation failed',
//                 errors: errors.array(),
//             });
//         }

//         const { amount, description } = req.body;
//         const amountInCents = Math.round(amount * 100); // Convert to cents

//         // Create withdrawal request
//         const withdrawal = await withdrawalService.createWithdrawalRequest(
//             req.driver._id,
//             amountInCents,
//             description
//         );

//         res.json({
//             code: '1',
//             message: req.t('withdrawal_request_created'),
//             withdrawal: {
//                 id: withdrawal._id,
//                 amount: withdrawal.amount / 100,
//                 netAmount: withdrawal.netAmount / 100,
//                 processingFee: withdrawal.processingFee / 100,
//                 status: withdrawal.status,
//                 createdAt: withdrawal.createdAt,
//             },
//         });
//     } catch (error) {
//         console.error('Create withdrawal request error:', error);
//         next(error);
//     }
// };

/**
 * Create withdrawal request
 */
exports.createWithdrawalRequest = async (req, res, next) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                code: '0',
                message: 'Validation failed',
                errors: errors.array(),
            });
        }

        const { amount, description = '' } = req.body;
        const amountInCents = Math.round(amount * 100);

        // 🔥 Service mein saare checks already hain (balance, pending, stripe etc.)
        const withdrawal = await withdrawalService.createWithdrawalRequest(
            req.driver._id,
            amountInCents,
            description
        );

        res.json({
            code: '1',
            message: req.t('withdrawal_request_created'),
            withdrawal: {
                id: withdrawal._id,
                amount: withdrawal.amount / 100,
                netAmount: withdrawal.netAmount / 100,
                processingFee: withdrawal.processingFee / 100,
                status: withdrawal.status,
                createdAt: withdrawal.createdAt,
            },
        });
    } catch (error) {
        console.error('Create withdrawal request error:', error);
        next(error);
    }
};

/**
 * Process withdrawal (admin or automated)
 */
exports.processWithdrawal = async (req, res, next) => {
    try {
        const { withdrawalId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(withdrawalId)) {
            return next(createError.BadRequest('Invalid withdrawal ID'));
        }

        const result = await withdrawalService.processWithdrawal(withdrawalId);

        res.json({
            code: '1',
            message: req.t('withdrawal_processed'),
            withdrawal: {
                id: result.withdrawal._id,
                amount: result.withdrawal.amount / 100,
                netAmount: result.withdrawal.netAmount / 100,
                status: result.withdrawal.status,
                stripeTransferId: result.withdrawal.stripeTransferId,
                processedAt: result.withdrawal.updatedAt,
            },
        });
    } catch (error) {
        console.error('Process withdrawal error:', error);
        next(error);
    }
};

/**
 * Get withdrawal history
 */
exports.getWithdrawalHistory = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            startDate,
            endDate,
        } = req.query;

        const result = await withdrawalService.getWithdrawalHistory(req.driver._id, {
            page,
            limit,
            status,
            startDate,
            endDate,
        });

        res.json({
            code: '1',
            message: req.t('success'),
            ...result,
        });
    } catch (error) {
        console.error('Get withdrawal history error:', error);
        next(error);
    }
};

/**
 * Cancel withdrawal request
 */
exports.cancelWithdrawal = async (req, res, next) => {
    try {
        const { withdrawalId } = req.params;
        const { reason } = req.body;

        if (!mongoose.Types.ObjectId.isValid(withdrawalId)) {
            return next(createError.BadRequest('Invalid withdrawal ID'));
        }

        // Verify the withdrawal belongs to the driver
        const withdrawal = await Wallet.findOne({
            _id: withdrawalId,
            driverId: req.driver._id,
            type: 'withdrawal',
        });

        if (!withdrawal) {
            return next(createError.NotFound('Withdrawal not found'));
        }

        const cancelledWithdrawal = await withdrawalService.cancelWithdrawal(
            withdrawalId,
            reason || 'Cancelled by driver'
        );

        res.json({
            code: '1',
            message: req.t('withdrawal_cancelled'),
            withdrawal: {
                id: cancelledWithdrawal._id,
                status: cancelledWithdrawal.status,
                cancelledAt: cancelledWithdrawal.updatedAt,
                reason: cancelledWithdrawal.failureReason,
            },
        });
    } catch (error) {
        console.error('Cancel withdrawal error:', error);
        next(error);
    }
}; 

/**
 * Update withdrawal settings
 */
exports.updateWithdrawalSettings = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                code: '0',
                message: 'Validation failed',
                errors: errors.array(),
            });
        }

        const {
            autoWithdrawal,
            autoWithdrawalThreshold,
            withdrawalDay,
            minimumAmount,
        } = req.body;

        const updateData = {};
        if (autoWithdrawal !== undefined) {
            updateData['withdrawalSettings.autoWithdrawal'] = autoWithdrawal;
        }
        if (autoWithdrawalThreshold !== undefined) {
            updateData['withdrawalSettings.autoWithdrawalThreshold'] = Math.round(autoWithdrawalThreshold * 100);
        }
        if (withdrawalDay !== undefined) {
            updateData['withdrawalSettings.withdrawalDay'] = withdrawalDay;
        }
        if (minimumAmount !== undefined) {
            updateData['withdrawalSettings.minimumAmount'] = Math.round(minimumAmount * 100);
        }

        const updatedDriver = await Driver.findByIdAndUpdate(
            req.driver._id,
            updateData,
            { new: true, select: 'withdrawalSettings' }
        );

        res.json({
            code: '1',
            message: req.t('withdrawal_settings_updated'),
            withdrawalSettings: {
                autoWithdrawal: updatedDriver.withdrawalSettings.autoWithdrawal,
                autoWithdrawalThreshold: updatedDriver.withdrawalSettings.autoWithdrawalThreshold / 100,
                withdrawalDay: updatedDriver.withdrawalSettings.withdrawalDay,
                minimumAmount: updatedDriver.withdrawalSettings.minimumAmount / 100,
            },
        });
    } catch (error) {
        console.error('Update withdrawal settings error:', error);
        next(error);
    }
};

/**
 * Get withdrawal fees and limits
 */
exports.getWithdrawalInfo = async (req, res, next) => {
    try {
        const { amount } = req.query;

        const info = {
            minimumAmount: withdrawalService.minimumWithdrawalAmount / 100,
            maximumAmount: withdrawalService.maximumWithdrawalAmount / 100,
            feePercent: withdrawalService.withdrawalFeePercent,
            minimumFee: withdrawalService.minimumWithdrawalFee / 100,
        };

        if (amount) {
            const amountInCents = Math.round(parseFloat(amount) * 100);
            const fee = withdrawalService.calculateWithdrawalFee(amountInCents);
            info.calculatedFee = fee / 100;
            info.netAmount = (amountInCents - fee) / 100;
        }

        res.json({
            code: '1',
            message: req.t('success'),
            withdrawalInfo: info,
        });
    } catch (error) {
        console.error('Get withdrawal info error:', error);
        next(error);
    }
};

/**
 * Get bank account info
 */
exports.getBankAccountInfo = async (req, res, next) => {
    try {
        const driver = await Driver.findById(req.driver._id).select('bankAccount stripeConnectAccountId');

        res.json({
            code: '1',
            message: req.t('success'),
            bankAccount: driver.getFormattedBankAccount(),
            hasStripeAccount: !!driver.stripeConnectAccountId,
        });
    } catch (error) {
        console.error('Get bank account info error:', error);
        next(error);
    }
};

/**
 * Webhook handler for Stripe Connect events
 */
exports.handleStripeWebhook = async (req, res, next) => {
    try {
        const sig = req.headers['stripe-signature'];
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

        let event;
        try {
            event = require('stripe').webhooks.constructEvent(req.body, sig, endpointSecret);
        } catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Handle the event
        switch (event.type) {
            case 'account.updated':
                await handleAccountUpdated(event.data.object);
                break;

            case 'transfer.paid':
                await handleTransferPaid(event.data.object);
                break;

            case 'transfer.failed':
                await handleTransferFailed(event.data.object);
                break;

            case 'payout.paid':
                await handlePayoutPaid(event.data.object);
                break;

            case 'payout.failed':
                await handlePayoutFailed(event.data.object);
                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Stripe webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

// Helper functions for webhook handling
async function handleAccountUpdated(account) {
    try {
        await withdrawalService.updateAccountStatus(account.id);
        console.log('Account updated:', account.id);
    } catch (error) {
        console.error('Error handling account update:', error);
    }
}

async function handleTransferPaid(transfer) {
    try {
        await Wallet.findOneAndUpdate(
            { stripeTransferId: transfer.id },
            {
                status: 'completed',
                updatedAt: new Date(),
            }
        );
        console.log('Transfer completed:', transfer.id);
    } catch (error) {
        console.error('Error handling transfer paid:', error);
    }
}

async function handleTransferFailed(transfer) {
    try {
        await Wallet.findOneAndUpdate(
            { stripeTransferId: transfer.id },
            {
                status: 'failed',
                failureReason: transfer.failure_message || 'Transfer failed',
                updatedAt: new Date(),
            }
        );
        console.log('Transfer failed:', transfer.id);
    } catch (error) {
        console.error('Error handling transfer failed:', error);
    }
}

async function handlePayoutPaid(payout) {
    console.log('Payout completed:', payout.id);
    // Additional logic for payout tracking if needed
}

async function handlePayoutFailed(payout) {
    console.log('Payout failed:', payout.id);
    // Additional logic for failed payout handling if needed
}
