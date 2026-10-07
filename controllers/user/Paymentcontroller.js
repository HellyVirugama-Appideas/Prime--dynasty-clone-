const createError = require('http-errors');
const stripe = require('../../config/stripe.js');
const User = require('../../models/userModel');
const Wallet = require('../../models/wallet');
const Transaction = require('../../models/transaction');
const Ride = require('../../models/rideModel');
const BookingReq = require("../../models/bookingReqModel.js")
const Booking = require('../../models/bookingModel');
const { calculateCommission } = require('../../utils/commissionHelper');
const { sendNotification } = require('../../utils/sendNotification.js');
const Driver = require('../../models/driverModel');
const Charges = require('../../models/chargesModel');
const { applyOfferDiscount, recordOfferRedemption } = require('../../utils/applyOfferDiscount');


// exports.getWalletBalance = async (req, res, next) => {
//     try {
//         const { page = 1, limit = 20 } = req.body;
//         const skip = (page - 1) * limit;

//         // ================= HELPER =================
//         const capitalize = (text) => {
//             if (!text) return null;
//             return text.charAt(0).toUpperCase() + text.slice(1);
//         };

//         const formatType = (t, useFor) => {
//             // Wallet Add
//             if (t.type === 'add') return 'Add';

//             // Rent Car
//             if (t.bookingId && !t.rideId) return 'Rent Car';

//             // Driver useFor (taxi / bike)
//             if (useFor) return capitalize(useFor);

//             return 'Ride';
//         };

//         // ================= WALLET BALANCE =================
//         const walletTransactions = await Wallet.find({
//             userId: req.user.id,
//             status: 'completed',
//         });

//         let balance = 0;

//         walletTransactions.forEach(t => {
//             if (t.type === 'add') balance += t.amount;
//             else if (t.type === 'use') balance -= t.amount;
//         });

//         // ================= WALLET DATA =================
//         const walletTx = await Wallet.find({ userId: req.user.id })
//             .populate({
//                 path: 'rideId',
//                 populate: {
//                     path: 'driver',
//                     select: 'useFor'
//                 }
//             }) // ✅ DRIVER POPULATE
//             .sort({ createdAt: -1 })
//             .lean();

//         // ================= OTHER TX =================
//         const otherTx = await Transaction.find({
//             userId: req.user.id,
//             status: 'completed',
//             paymentMethod: { $in: ['cash', 'card'] }
//         })
//             .populate({
//                 path: 'rideId',
//                 populate: {
//                     path: 'driver',
//                     select: 'useFor'
//                 }
//             }) // ✅ DRIVER POPULATE
//             .sort({ createdAt: -1 })
//             .lean();

//         // ================= FORMAT WALLET =================
//         const formattedWallet = walletTx.map(t => {
//             const useFor = t.rideId?.driver?.useFor; // ✅ DRIVER FIELD

//             return {
//                 _id: t._id,
//                 type: formatType(t, useFor), // ✅ FIXED

//                 rideId: t.rideId?._id || t.rideId || null,
//                 bookingId: t.bookingId || null,

//                 amount: t.amount / 100,
//                 grossAmount: t.grossAmount ? t.grossAmount / 100 : 0,
//                 adminCommission: t.adminCommission ? t.adminCommission / 100 : 0,

//                 paymentMethod: 'wallet',
//                 status: t.status || 'completed',
//                 source: 'wallet',

//                 createdAt: t.createdAt,
//             };
//         });

//         // ================= FORMAT OTHER =================
//         const formattedOther = otherTx.map(t => {
//             const useFor = t.rideId?.driver?.useFor;

//             return {
//                 _id: t._id,
//                 type: formatType(t, useFor), // ✅ FIXED

//                 rideId: t.rideId?._id || t.rideId || null,
//                 bookingId: t.bookingId || null,

//                 amount: t.amount / 100,
//                 grossAmount: t.amount / 100,
//                 adminCommission: t.adminCommission ? t.adminCommission / 100 : 0,

//                 paymentMethod: t.paymentMethod,
//                 status: t.status,
//                 source: t.paymentMethod,

//                 createdAt: t.createdAt,
//             };
//         });

//         // ================= MERGE =================
//         let allTransactions = [...formattedWallet, ...formattedOther];

//         // ================= SORT =================
//         allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

//         // ================= PAGINATION =================
//         const paginated = allTransactions.slice(skip, skip + parseInt(limit));

//         // ================= RESPONSE =================
//         res.json({
//             code: '1',
//             message: req.t('success'),

//             balance: balance / 100,
//             transactions: paginated,

//             pagination: {
//                 currentPage: parseInt(page),
//                 totalPages: Math.ceil(allTransactions.length / limit),
//                 totalTransactions: allTransactions.length,
//                 hasMore: skip + paginated.length < allTransactions.length,
//             },
//         });

//     } catch (error) {
//         console.log('❌ getWalletBalance Error:', error);
//         next(error);
//     }
// };

exports.getWalletBalance = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search = '', filter = 'All' } = req.body;
        const skip = (page - 1) * limit;

        // ================= VALIDATION =================
        const allowedFilters = ['All', 'Debit', 'Credit'];
        if (!allowedFilters.includes(filter)) {
            return next(createError.BadRequest('filter must be one of: All, Debit, Credit'));
        }

        // ================= HELPER =================
        const capitalize = (text) => {
            if (!text) return null;
            return text.charAt(0).toUpperCase() + text.slice(1);
        };

        const formatType = (t, useFor) => {
            // Wallet Add
            if (t.type === 'add') return 'Add';

            // Rent Car
            if (t.bookingId && !t.rideId) return 'Rent Car';

            // Driver useFor (taxi / bike)
            if (useFor) return capitalize(useFor);

            return 'Ride';
        };

        // ✅ NEW: Credit / Debit decide karne ke liye
        const getTxType = (t, isWallet) => {
            if (isWallet) {
                return t.type === 'add' ? 'Credit' : 'Debit';
            }
            // cash/card payments — user ne pay kiya, so Debit
            return 'Debit';
        };

        // ================= WALLET BALANCE =================
        const walletTransactions = await Wallet.find({
            userId: req.user.id,
            status: 'completed',
        });

        let balance = 0;

        walletTransactions.forEach(t => {
            if (t.type === 'add') balance += t.amount;
            else if (t.type === 'use') balance -= t.amount;
        });

        // ================= WALLET DATA =================
        const walletTx = await Wallet.find({ userId: req.user.id })
            .populate({
                path: 'rideId',
                populate: {
                    path: 'driver',
                    select: 'useFor'
                }
            })
            .sort({ createdAt: -1 })
            .lean();

        // ================= OTHER TX =================
        const otherTx = await Transaction.find({
            userId: req.user.id,
            status: 'completed',
            paymentMethod: { $in: ['cash', 'card'] }
        })
            .populate({
                path: 'rideId',
                populate: {
                    path: 'driver',
                    select: 'useFor'
                }
            })
            .sort({ createdAt: -1 })
            .lean();

        // ================= FORMAT WALLET =================
        const formattedWallet = walletTx.map(t => {
            const useFor = t.rideId?.driver?.useFor;
            const typeLabel = formatType(t, useFor);

            return {
                _id: t._id,
                type: typeLabel,
                transactionType: getTxType(t, true), // ✅ Credit / Debit

                rideId: t.rideId?._id || t.rideId || null,
                bookingId: t.bookingId || null,

                amount: t.amount / 100,
                grossAmount: t.grossAmount ? t.grossAmount / 100 : 0,
                adminCommission: t.adminCommission ? t.adminCommission / 100 : 0,

                paymentMethod: 'wallet',
                status: t.status || 'completed',
                source: 'wallet',

                createdAt: t.createdAt,
            };
        });

        // ================= FORMAT OTHER =================
        const formattedOther = otherTx.map(t => {
            const useFor = t.rideId?.driver?.useFor;
            const typeLabel = formatType(t, useFor);

            return {
                _id: t._id,
                type: typeLabel,
                transactionType: getTxType(t, false), // ✅ Credit / Debit

                rideId: t.rideId?._id || t.rideId || null,
                bookingId: t.bookingId || null,

                amount: t.amount / 100,
                grossAmount: t.amount / 100,
                adminCommission: t.adminCommission ? t.adminCommission / 100 : 0,

                paymentMethod: t.paymentMethod,
                status: t.status,
                source: t.paymentMethod,

                createdAt: t.createdAt,
            };
        });

        // ================= MERGE =================
        let allTransactions = [...formattedWallet, ...formattedOther];

        // ================= FILTER: Debit / Credit =================
        if (filter !== 'All') {
            allTransactions = allTransactions.filter(
                t => t.transactionType === filter
            );
        }

        // ================= SEARCH =================
        if (search && search.trim() !== '') {
            const searchRegex = new RegExp(search.trim(), 'i');
            allTransactions = allTransactions.filter(t => {
                return (
                    searchRegex.test(t.type || '') ||
                    searchRegex.test(t.paymentMethod || '') ||
                    searchRegex.test(t.source || '') ||
                    searchRegex.test(String(t.amount)) ||
                    searchRegex.test(String(t._id)) ||
                    (t.rideId && searchRegex.test(String(t.rideId))) ||
                    (t.bookingId && searchRegex.test(String(t.bookingId)))
                );
            });
        }

        // ================= SORT =================
        allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // ================= PAGINATION =================
        const paginated = allTransactions.slice(skip, skip + parseInt(limit));

        // ================= RESPONSE =================
        res.json({
            code: '1',
            message: req.t('success'),

            balance: balance / 100,
            filter,
            search,
            transactions: paginated,

            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(allTransactions.length / limit),
                totalTransactions: allTransactions.length,
                hasMore: skip + paginated.length < allTransactions.length,
            },
        });

    } catch (error) {
        console.log('❌ getWalletBalance Error:', error);
        next(error);
    }
};

/**
 * Create Stripe payment intent for adding money to wallet
 */
// exports.createWalletTopup = async (req, res, next) => {
//     try {
//         const { amount } = req.body; // amount in currency units (e.g., dollars)

//         if (!amount || amount <= 0) {
//             return next(createError.BadRequest('Invalid amount'));
//         }

//         const amountInCents = Math.round(amount * 100);

//         // Create or get Stripe customer
//         let stripeCustomerId = req.user.stripeCustomerId;

//         if (!stripeCustomerId) {
//             const customer = await stripe.customers.create({
//                 email: req.user.email,
//                 name: req.user.name,
//                 metadata: {
//                     userId: req.user.id.toString(),
//                 },
//             });
//             stripeCustomerId = customer.id;

//             // Save customer ID to user
//             await User.findByIdAndUpdate(req.user.id, {
//                 stripeCustomerId: customer.id,
//             });
//         }

//         // Create payment intent
//         const paymentIntent = await stripe.paymentIntents.create({
//             amount: amountInCents,
//             currency: process.env.STRIPE_CURRENCY || 'usd',
//             customer: stripeCustomerId,
//             metadata: {
//                 userId: req.user.id.toString(),
//                 type: 'wallet_topup',
//             },
//             automatic_payment_methods: {
//                 enabled: true,
//             },
//         });

//         // Create pending wallet transaction
//         const walletTransaction = await Wallet.create({
//             userId: req.user.id,
//             type: 'add',
//             amount: amountInCents,
//             status: 'pending',
//             stripeCustomerId: paymentIntent.id,
//         });

//         res.json({
//             code: '1',
//             message: req.t('payment.intent.created'),
//             clientSecret: paymentIntent.client_secret,
//             paymentIntentId: paymentIntent.id,
//             transactionId: walletTransaction._id,
//         });
//     } catch (error) {
//         next(error);
//     }
// };
exports.createWalletTopup = async (req, res, next) => {
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return next(createError.BadRequest('Invalid amount'));
        }

        const amountInCents = Math.round(amount * 100);

        // Get or create Stripe customer
        let stripeCustomerId = req.user.stripeCustomerId;

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: req.user.email,
                name: req.user.name,
                metadata: { userId: req.user.id.toString() },
            });
            stripeCustomerId = customer.id;

            await User.findByIdAndUpdate(req.user.id, { stripeCustomerId });
        }

        // Create Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: process.env.STRIPE_CURRENCY || 'usd',
            customer: stripeCustomerId,
            metadata: {
                userId: req.user.id.toString(),
                type: 'wallet_topup',
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        // Save pending transaction
        const walletTransaction = await Wallet.create({
            userId: req.user.id,
            type: 'add',
            amount: amountInCents,
            status: 'pending',
            stripeCustomerId: paymentIntent.id,
        });

        res.json({
            code: '1',
            message: 'Payment intent created',
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            transactionId: walletTransaction._id,
        });

    } catch (error) {
        next(error);
    }
};
/**
 * Confirm wallet topup after successful Stripe payment
 */
// exports.confirmWalletTopup = async (req, res, next) => {
//     try {
//         const { paymentIntentId } = req.body;

//         if (!paymentIntentId) {
//             return next(
//                 createError.BadRequest('Payment intent ID is required')
//             );
//         }

//         // Verify payment intent with Stripe
//         const paymentIntent = await stripe.paymentIntents.retrieve(
//             paymentIntentId
//         );

//         if (paymentIntent.status !== 'succeeded') {
//             console.log('paymentIntent.status: ', paymentIntent.status);
//             return next(createError.BadRequest('Payment not successful'));
//         }

//         // Update wallet transaction
//         const walletTransaction = await Wallet.findOneAndUpdate(
//             {
//                 userId: req.user.id,
//                 stripeCustomerId: paymentIntentId,
//                 status: 'pending',
//             },
//             { status: 'completed' },
//             { new: true }
//         );

//         if (!walletTransaction) {
//             return next(createError.NotFound('Transaction not found'));
//         }

//         // Calculate new balance
//         const walletTransactions = await Wallet.find({
//             userId: req.user.id,
//             status: 'completed',
//         });

//         let balance = 0;
//         walletTransactions.forEach(transaction => {
//             if (transaction.type === 'add') {
//                 balance += transaction.amount;
//             } else if (transaction.type === 'use') {
//                 balance -= transaction.amount;
//             }
//         });

//         res.json({
//             code: '1',
//             message: req.t('wallet.topup.success'),
//             balance: balance / 100,
//             transaction: walletTransaction,
//         });
//     } catch (error) {
//         next(error);
//     }
// };

exports.confirmWalletTopup = async (req, res, next) => {
    try {
        const { paymentIntentId } = req.body;

        if (!paymentIntentId) {
            return next(createError.BadRequest('Payment intent ID is required'));
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        console.log('PaymentIntent Status:', paymentIntent.status);

        if (paymentIntent.status !== 'succeeded') {
            return next(createError.BadRequest(`Payment not completed yet. Current status: ${paymentIntent.status}`));
        }

        // Update wallet transaction
        const walletTransaction = await Wallet.findOneAndUpdate(
            {
                userId: req.user.id,
                stripeCustomerId: paymentIntentId,
                status: 'pending',
            },
            { status: 'completed' },
            { new: true }
        );

        if (!walletTransaction) {
            return next(createError.NotFound('Transaction not found'));
        }

        // Calculate new balance
        const transactions = await Wallet.find({
            userId: req.user.id,
            status: 'completed',
        });

        let balance = 0;
        transactions.forEach(t => {
            if (t.type === 'add') balance += t.amount;
            else if (t.type === 'use') balance -= t.amount;
        });

        res.json({
            code: '1',
            message: req.t('wallet.topup.success') || 'Wallet topped up successfully',
            balance: balance / 100,
            transaction: walletTransaction,
        });

    } catch (error) {
        console.error('confirmWalletTopup Error:', error);
        next(error);
    }
};
/**
 * Process payment for ride using wallet
 */
// exports.payRideWithWallet = async (req, res, next) => {
//     try {
//         const { rideId, amount } = req.body;

//         if (!rideId || !amount || amount <= 0) {
//             return next(createError.BadRequest('Invalid ride ID or amount'));
//         }

//         const amountInCents = Math.round(amount * 100);

//         // Check if ride exists
//         const ride = await Ride.findById(rideId);
//         if (!ride) {
//             return next(createError.NotFound('Ride not found'));
//         }

//         // Verify user owns this ride
//         if (ride.user.toString() !== req.user.id.toString()) {
//             return next(createError.Forbidden('Unauthorized'));
//         }

//         // Calculate current wallet balance
//         const walletTransactions = await Wallet.find({
//             userId: req.user.id,
//             status: 'completed',
//         });

//         let balance = 0;
//         walletTransactions.forEach(transaction => {
//             if (transaction.type === 'add') {
//                 balance += transaction.amount;
//             } else if (transaction.type === 'use') {
//                 balance -= transaction.amount;
//             }
//         });

//         // Check if sufficient balance
//         if (balance < amountInCents) {
//             return res.json({
//                 code: '0',
//                 message: req.t('wallet.insufficient.balance'),
//                 balance: balance / 100,
//                 required: amount,
//             });
//         }

//         // Calculate admin commission
//         const { adminCommission, driverAmount, commissionRate, commissionType } =
//             await calculateCommission(amountInCents, 'ride_payment');

//         // Create wallet deduction transaction for user (full amount)
//         const walletTransaction = await Wallet.create({
//             userId: req.user.id,
//             type: 'use',
//             amount: amountInCents,
//             status: 'completed',
//             rideId: rideId,
//             description: 'Ride payment',
//             grossAmount: amountInCents,
//             adminCommission,
//             commissionRate,
//             commissionType,
//         });

//         // Credit driver wallet with amount AFTER commission
//         if (ride.driver) {
//             await Wallet.create({
//                 driverId: ride.driver,
//                 type: 'add',
//                 amount: driverAmount,
//                 status: 'completed',
//                 rideId: rideId,
//                 description: 'Earnings from ride (after admin commission)',
//                 grossAmount: amountInCents,
//                 adminCommission,
//                 commissionRate,
//                 commissionType,
//             });
//         }

//         // Create transaction record with commission breakdown
//         const transaction = await Transaction.create({
//             userId: req.user.id,
//             amount: amountInCents,
//             paymentMethod: 'wallet',
//             type: 'ride_payment',
//             status: 'completed',
//             rideId: rideId,
//             adminCommission,
//             driverAmount,
//             commissionRate,
//             commissionType,
//         });

//         if (ride.driver) {
//             const driver = await User.findById(ride.driver);

//             if (driver && driver.fcmToken) {
//                 const driverNotification = {
//                     driver: ride.driver,
//                     rideId: rideId,
//                     title: 'Payment Received',
//                     body: `${req.user.name} paid ₹${amount} for the ride.`,
//                 };

//                 await sendNotification(driver.fcmToken, driverNotification);
//             }
//         }

//         // Update ride payment status
//         // await Ride.findByIdAndUpdate(rideId, {
//         //     paymentStatus: 'completed',
//         //     paymentMethod: 'wallet',
//         // });

//         const newBalance = balance - amountInCents;

//         res.json({
//             code: '1',
//             message: req.t('payment.successful'),
//             balance: newBalance / 100,
//             transaction: {
//                 id: transaction._id,
//                 amount: amount,
//                 rideId: rideId,
//                 createdAt: transaction.createdAt,
//             },
//         });
//     } catch (error) {
//         next(error);
//     }
// };

// exports.payRideWithWallet = async (req, res, next) => {
//     try {
//         const { rideId, amount } = req.body;

//         if (!rideId || !amount || amount <= 0) {
//             return next(createError.BadRequest('Invalid ride ID or amount'));
//         }

//         // ✅ Convert ₹ → cents
//         const amountInCents = Math.round(amount * 100);

//         // ✅ Get ride with driver (IMPORTANT)
//         const ride = await Ride.findById(rideId).populate('driver', 'fcmToken name');
//         if (!ride) {
//             return next(createError.NotFound('Ride not found'));
//         }

//         // ✅ Verify ownership
//         if (ride.user.toString() !== req.user.id.toString()) {
//             return next(createError.Forbidden('Unauthorized'));
//         }

//         // ✅ Calculate wallet balance
//         const walletTransactions = await Wallet.find({
//             userId: req.user.id,
//             status: 'completed',
//         });

//         let balance = 0;
//         walletTransactions.forEach(t => {
//             if (t.type === 'add') balance += t.amount;
//             else if (t.type === 'use') balance -= t.amount;
//         });

//         // ✅ Check balance
//         if (balance < amountInCents) {
//             return res.json({
//                 code: '0',
//                 message: req.t('Insufficient wallet balance'),
//                 balance: balance / 100,
//                 required: amount,
//             });
//         }

//         // ✅ Commission (FIXED - cents based)
//         const { adminCommission, driverAmount, commissionRate, commissionType } =
//             await calculateCommission(amountInCents, 'ride_payment');

//         // ✅ Deduct user wallet
//         await Wallet.create({
//             userId: req.user.id,
//             type: 'use',
//             amount: amountInCents,
//             status: 'completed',
//             rideId: rideId,
//             description: 'Ride payment',
//             grossAmount: amountInCents,
//             adminCommission,
//             commissionRate,
//             commissionType,
//         });

//         // ✅ Credit driver wallet
//         if (ride.driver) {
//             await Wallet.create({
//                 driverId: ride.driver._id,
//                 type: 'add',
//                 amount: driverAmount,
//                 status: 'completed',
//                 rideId: rideId,
//                 description: 'Earnings from ride (after admin commission)',
//                 grossAmount: amountInCents,
//                 adminCommission,
//                 commissionRate,
//                 commissionType,
//             });
//         }

//         // ✅ Save transaction
//         const transaction = await Transaction.create({
//             userId: req.user.id,
//             amount: amountInCents,
//             paymentMethod: 'wallet',
//             type: 'ride_payment',
//             status: 'completed',
//             rideId: rideId,
//             adminCommission,
//             driverAmount,
//             commissionRate,
//             commissionType,
//         });

//         // ✅ 🔔 DRIVER NOTIFICATION (FINAL)
//         if (ride.driver && ride.driver.fcmToken) {
//             const driverNotification = {
//                 driver: ride.driver._id,
//                 rideId: rideId,
//                 title: 'Payment Received',
//                 body: `${req.user.name} paid ₹${amount} for the ride.`,
//             };

//             await sendNotification(ride.driver.fcmToken, driverNotification);
//         }

//         // ✅ Final balance
//         const newBalance = balance - amountInCents;

//         res.json({
//             code: '1',
//             message: req.t('payment.successful'),
//             balance: newBalance / 100,
//             transaction: {
//                 id: transaction._id,
//                 amount: amount,
//                 rideId: rideId,
//                 createdAt: transaction.createdAt,
//             },
//         });

//     } catch (error) {
//         next(error);
//     }
// };

exports.payRideWithWallet = async (req, res, next) => {
    try {
        const { rideId, amount, couponCode } = req.body;

        if (!rideId || !amount || amount <= 0) {
            return next(createError.BadRequest('Invalid ride ID or amount'));
        }

        // ✅ Get ride with driver
        const ride = await Ride.findById(rideId).populate('driver', 'fcmToken name');
        if (!ride) {
            return next(createError.NotFound('Ride not found'));
        }

        // ✅ Verify ownership
        if (ride.user.toString() !== req.user.id.toString()) {
            return next(createError.Forbidden('Unauthorized'));
        }

        // ✅ Apply coupon (optional)
        let discount = 0;
        let couponApplied = null;
        let offerId = null;

        if (couponCode) {
            try {
                const result = await applyOfferDiscount({
                    couponCode,
                    amount,
                    type: 'ride',
                    userId: req.user.id,
                });
                discount = result.discount;
                couponApplied = result.couponApplied;
                offerId = result.offerId;
            } catch (couponError) {
                return next(createError.BadRequest(couponError.message));
            }
        }

        const finalAmount = Number((amount - discount).toFixed(2));
        const amountInCents = Math.round(finalAmount * 100);

        // ✅ Calculate wallet balance
        const walletTransactions = await Wallet.find({
            userId: req.user.id,
            status: 'completed',
        });

        let balance = 0;
        walletTransactions.forEach(t => {
            if (t.type === 'add') balance += t.amount;
            else if (t.type === 'use') balance -= t.amount;
        });

        // ✅ Check balance (against discounted amount)
        if (balance < amountInCents) {
            return res.json({
                code: '0',
                message: req.t('Insufficient wallet balance'),
                balance: balance / 100,
                required: finalAmount,
            });
        }

        // ✅ Commission (on discounted amount actually charged)
        const { adminCommission, driverAmount, commissionRate, commissionType } =
            await calculateCommission(amountInCents, 'ride_payment');

        // ✅ Deduct user wallet
        await Wallet.create({
            userId: req.user.id,
            type: 'use',
            amount: amountInCents,
            status: 'completed',
            rideId: rideId,
            description: couponApplied ? `Ride payment (coupon: ${couponApplied})` : 'Ride payment',
            grossAmount: amountInCents,
            adminCommission,
            commissionRate,
            commissionType,
        });

        // ✅ Credit driver wallet
        if (ride.driver) {
            await Wallet.create({
                driverId: ride.driver._id,
                type: 'add',
                amount: driverAmount,
                status: 'completed',
                rideId: rideId,
                description: 'Earnings from ride (after admin commission)',
                grossAmount: amountInCents,
                adminCommission,
                commissionRate,
                commissionType,
            });
        }

        // ✅ Save transaction
        const transaction = await Transaction.create({
            userId: req.user.id,
            amount: amountInCents,
            paymentMethod: 'wallet',
            type: 'ride_payment',
            status: 'completed',
            rideId: rideId,
            adminCommission,
            driverAmount,
            commissionRate,
            commissionType,
            couponCode: couponApplied || undefined,
            discountAmount: Math.round(discount * 100),
        });

        // ✅ Record offer redemption (after success)
        if (offerId) {
            await recordOfferRedemption({
                userId: req.user.id,
                offerId,
                referenceType: 'ride',
                referenceId: rideId,
                discountAmount: discount,
            });
        }

        // ✅ Update ride payment status
        await Ride.findByIdAndUpdate(rideId, {
            paymentStatus: 'completed',
            paymentMethod: 'wallet',
        });

        // ✅ Driver notification
        if (ride.driver && ride.driver.fcmToken) {
            await sendNotification(ride.driver.fcmToken, {
                driver: ride.driver._id,
                rideId: rideId,
                title: 'Payment Received',
                body: `${req.user.name} paid ${finalAmount} for the ride.`,
            });
        }

        const newBalance = balance - amountInCents;

        res.json({
            code: '1',
            message: req.t('payment.successful'),
            balance: newBalance / 100,
            transaction: {
                id: transaction._id,
                originalAmount: amount,
                discount,
                amount: finalAmount,
                couponApplied,
                rideId: rideId,
                createdAt: transaction.createdAt,
            },
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Process payment for booking using wallet
 */
// exports.payBookingWithWallet = async (req, res, next) => {
//     try {
//         const { bookingId, amount } = req.body;

//         if (!bookingId || !amount || amount <= 0) {
//             return next(createError.BadRequest('Invalid booking ID or amount'));
//         }

//         const amountInCents = Math.round(amount * 100);

//         // Check if booking exists
//         const booking = await Booking.findById(bookingId);
//         if (!booking) {
//             return next(createError.NotFound('Booking not found'));
//         }

//         // Verify user owns this booking
//         if (booking.user.toString() !== req.user.id.toString()) {
//             return next(createError.Forbidden('Unauthorized'));
//         }

//         // Calculate current wallet balance
//         const walletTransactions = await Wallet.find({
//             userId: req.user.id,
//             status: 'completed',
//         });

//         let balance = 0;
//         walletTransactions.forEach(transaction => {
//             if (transaction.type === 'add') {
//                 balance += transaction.amount;
//             } else if (transaction.type === 'use') {
//                 balance -= transaction.amount;
//             }
//         });

//         // Check if sufficient balance
//         if (balance < amountInCents) {
//             return res.json({
//                 code: '0',
//                 message: req.t('wallet.insufficient.balance'),
//                 balance: balance / 100,
//                 required: amount,
//             });
//         }

//         // Create wallet deduction transaction for user
//         const walletTransaction = await Wallet.create({
//             userId: req.user.id,
//             type: 'use',
//             amount: amountInCents,
//             status: 'completed',
//             bookingId: bookingId,
//             description: 'Booking payment',
//         });

//         // Credit driver wallet with the same amount
//         if (booking.driver) {
//             await Wallet.create({
//                 driverId: booking.driver,
//                 type: 'add',
//                 amount: amountInCents,
//                 status: 'completed',
//                 bookingId: bookingId,
//                 description: 'Earnings from booking',
//             });
//         }

//         // Create transaction record
//         const transaction = await Transaction.create({
//             userId: req.user.id,
//             amount: amountInCents,
//             paymentMethod: 'wallet',
//             type: 'rent car',
//             status: 'completed',
//             rideId: bookingId, // Using rideId field for bookingId
//         });

//         // Update booking payment status
//         await Booking.findByIdAndUpdate(bookingId, {
//             paymentStatus: 'completed',
//             paymentMethod: 'wallet',
//         });

//         const newBalance = balance - amountInCents;

//         res.json({
//             code: '1',
//             message: req.t('payment.successful'),
//             balance: newBalance / 100,
//             transaction: {
//                 id: transaction._id,
//                 amount: amount,
//                 bookingId: bookingId,
//                 createdAt: transaction.createdAt,
//             },
//         });
//     } catch (error) {
//         next(error);
//     }
// };

/**
 * Process payment for booking using wallet (FINAL FIXED + DETAILED LOGGING)
 */
// exports.payBookingWithWallet = async (req, res, next) => {
//     try {
//         const { bookingId, amount } = req.body;

//         if (!bookingId || !amount || amount <= 0) {
//             return next(createError.BadRequest('Invalid booking ID or amount'));
//         }

//         const amountInCents = Math.round(amount * 100);

//         // ✅ Find Booking (NOT BookingReq)
//         const booking = await Booking.findById(bookingId)
//             .populate('driver', 'fcmToken name')
//             .populate('car', 'name');

//         if (!booking) {
//             return next(createError.NotFound('Booking not found'));
//         }

//         // ✅ Ownership check
//         if (booking.user.toString() !== req.user.id.toString()) {
//             return next(createError.Forbidden('Unauthorized'));
//         }

//         // ✅ Already paid check
//         if (booking.paymentStatus === 'completed') {
//             return next(createError.BadRequest('Booking already paid'));
//         }

//         // ================= WALLET BALANCE =================
//         const walletTransactions = await Wallet.find({
//             userId: req.user.id,
//             status: 'completed',
//         });

//         let balance = 0;
//         walletTransactions.forEach(t => {
//             if (t.type === 'add') balance += t.amount;
//             else if (t.type === 'use') balance -= t.amount;
//         });

//         if (balance < amountInCents) {
//             return res.json({
//                 code: '0',
//                 message: 'Insufficient wallet balance',
//                 balance: balance / 100,
//                 required: amount,
//             });
//         }

//         // ================= COMMISSION =================
//         const { adminCommission, driverAmount, commissionRate, commissionType } =
//             await calculateCommission(amountInCents, 'rent car');

//         // ================= USER WALLET DEDUCT =================
//         await Wallet.create({
//             userId: req.user.id,
//             type: 'use',
//             amount: amountInCents,
//             status: 'completed',
//             bookingId: bookingId,
//             description: 'Car rental payment',
//             grossAmount: amountInCents,
//             adminCommission,
//             commissionRate,
//             commissionType,
//         });

//         // ================= DRIVER WALLET CREDIT =================
//         if (booking.driver) {
//             await Wallet.create({
//                 driverId: booking.driver._id,
//                 type: 'add',
//                 amount: driverAmount,
//                 status: 'completed',
//                 bookingId: bookingId,
//                 description: 'Earnings from booking',
//                 grossAmount: amountInCents,
//                 adminCommission,
//                 commissionRate,
//                 commissionType,
//             });
//         }

//         // ================= TRANSACTION =================
//         const transaction = await Transaction.create({
//             userId: req.user.id,
//             amount: amountInCents,
//             paymentMethod: 'wallet',
//             type: 'rent car',
//             status: 'completed',
//             bookingId: bookingId,
//             adminCommission,
//             driverAmount,
//             commissionRate,
//             commissionType,
//         });

//         // ================= UPDATE BOOKING =================
//         await Booking.findByIdAndUpdate(bookingId, {
//             paymentStatus: 'completed',
//             paymentMethod: 'wallet',
//             paidAt: new Date(),
//         });

//         // ================= NOTIFICATIONS =================
//         if (req.user?.fcmToken) {
//             sendNotification(req.user.fcmToken, {
//                 title: 'Payment Successful',
//                 body: `Your payment for ${booking.car?.name} is successful.`,
//             });
//         }

//         if (booking.driver?.fcmToken) {
//             sendNotification(booking.driver.fcmToken, {
//                 driver: booking.driver._id,
//                 title: 'Payment Received',
//                 body: `${req.user.name} paid ₹${amount} for booking.`,
//             });
//         }

//         const newBalance = balance - amountInCents;

//         res.json({
//             code: '1',
//             message: 'Payment successful',
//             balance: newBalance / 100,
//             transaction: {
//                 id: transaction._id,
//                 amount,
//                 bookingId,
//                 createdAt: transaction.createdAt,
//             },
//         });

//     } catch (error) {
//         console.error('❌ payBookingWithWallet Error:', error);
//         next(error);
//     }
// };

exports.payBookingWithWallet = async (req, res, next) => {
    try {
        const { bookingId, amount, couponCode } = req.body;

        if (!bookingId || !amount || amount <= 0) {
            return next(createError.BadRequest('Invalid booking ID or amount'));
        }

        const booking = await Booking.findById(bookingId)
            .populate('driver', 'fcmToken name')
            .populate('car', 'name');

        if (!booking) {
            return next(createError.NotFound('Booking not found'));
        }

        if (booking.user.toString() !== req.user.id.toString()) {
            return next(createError.Forbidden('Unauthorized'));
        }

        if (booking.paymentStatus === 'completed') {
            return next(createError.BadRequest('Booking already paid'));
        }

        // ✅ Apply coupon (optional)
        let discount = 0;
        let couponApplied = null;
        let offerId = null;

        if (couponCode) {
            try {
                const result = await applyOfferDiscount({
                    couponCode,
                    amount,
                    type: 'rent',
                    userId: req.user.id,
                });
                discount = result.discount;
                couponApplied = result.couponApplied;
                offerId = result.offerId;
            } catch (couponError) {
                return next(createError.BadRequest(couponError.message));
            }
        }

        const finalAmount = Number((amount - discount).toFixed(2));
        const amountInCents = Math.round(finalAmount * 100);

        // ================= WALLET BALANCE =================
        const walletTransactions = await Wallet.find({
            userId: req.user.id,
            status: 'completed',
        });

        let balance = 0;
        walletTransactions.forEach(t => {
            if (t.type === 'add') balance += t.amount;
            else if (t.type === 'use') balance -= t.amount;
        });

        if (balance < amountInCents) {
            return res.json({
                code: '0',
                message: 'Insufficient wallet balance',
                balance: balance / 100,
                required: finalAmount,
            });
        }

        // ================= COMMISSION =================
        const { adminCommission, driverAmount, commissionRate, commissionType } =
            await calculateCommission(amountInCents, 'rent car');

        // ================= USER WALLET DEDUCT =================
        await Wallet.create({
            userId: req.user.id,
            type: 'use',
            amount: amountInCents,
            status: 'completed',
            bookingId: bookingId,
            description: couponApplied ? `Car rental payment (coupon: ${couponApplied})` : 'Car rental payment',
            grossAmount: amountInCents,
            adminCommission,
            commissionRate,
            commissionType,
        });

        // ================= DRIVER WALLET CREDIT =================
        if (booking.driver) {
            await Wallet.create({
                driverId: booking.driver._id,
                type: 'add',
                amount: driverAmount,
                status: 'completed',
                bookingId: bookingId,
                description: 'Earnings from booking',
                grossAmount: amountInCents,
                adminCommission,
                commissionRate,
                commissionType,
            });
        }

        // ================= TRANSACTION =================
        const transaction = await Transaction.create({
            userId: req.user.id,
            amount: amountInCents,
            paymentMethod: 'wallet',
            type: 'rent car',
            status: 'completed',
            bookingId: bookingId,
            adminCommission,
            driverAmount,
            commissionRate,
            commissionType,
            couponCode: couponApplied || undefined,
            discountAmount: Math.round(discount * 100),
        });

        // ✅ Record offer redemption
        if (offerId) {
            await recordOfferRedemption({
                userId: req.user.id,
                offerId,
                referenceType: 'rent',
                referenceId: bookingId,
                discountAmount: discount,
            });
        }

        // ================= UPDATE BOOKING =================
        await Booking.findByIdAndUpdate(bookingId, {
            paymentStatus: 'completed',
            paymentMethod: 'wallet',
            paidAt: new Date(),
        });

        // ================= NOTIFICATIONS =================
        if (req.user?.fcmToken) {
            sendNotification(req.user.fcmToken, {
                title: 'Payment Successful',
                body: `Your payment for ${booking.car?.name} is successful.`,
            });
        }

        if (booking.driver?.fcmToken) {
            sendNotification(booking.driver.fcmToken, {
                driver: booking.driver._id,
                title: 'Payment Received',
                body: `${req.user.name} paid ${finalAmount} for booking.`,
            });
        }

        const newBalance = balance - amountInCents;

        res.json({
            code: '1',
            message: 'Payment successful',
            balance: newBalance / 100,
            transaction: {
                id: transaction._id,
                originalAmount: amount,
                discount,
                amount: finalAmount,
                couponApplied,
                bookingId,
                createdAt: transaction.createdAt,
            },
        });

    } catch (error) {
        console.error('❌ payBookingWithWallet Error:', error);
        next(error);
    }
};

// exports.createDirectPayment = async (req, res, next) => {
//     try {
//         const { amount, type, referenceId } = req.body;

//         if (!amount || amount <= 0 || !type || !referenceId) {
//             return next(createError.BadRequest('Invalid payment details'));
//         }

//         const amountInCents = Math.round(amount * 100);

//         // Verify the ride/booking exists and belongs to user
//         let reference;
//         if (type === 'ride') {
//             reference = await Ride.findOne({
//                 _id: referenceId,
//             });
//         } else if (type === 'booking') {
//             reference = await Booking.findOne({
//                 _id: referenceId,
//                 user: req.user.id,
//             }).populate('driver', 'fcmToken name')
//                 .populate('car', 'name');

//             // Verify booking is accepted and not already paid
//             if (!reference) {
//                 return next(createError.BadRequest('Invalid Booking ID. Please use valid booking.'));
//             }
//             if (reference.status !== 'accepted' && reference.status !== 'confirmed') {
//                 return next(createError.BadRequest('Booking must be accepted first'));
//             }

//             // Prevent duplicate payment
//             if (reference.paymentStatus === 'completed') {
//                 return next(createError.BadRequest('Booking already paid'));
//             }
//         } else {
//             return next(createError.BadRequest('Invalid payment type'));
//         }

//         if (!reference) {
//             return next(createError.NotFound(`${type} not found`));
//         }

//         // Create or get Stripe customer
//         let stripeCustomerId = req.user.stripeCustomerId;

//         if (!stripeCustomerId) {
//             const customer = await stripe.customers.create({
//                 email: req.user.email,
//                 name: req.user.name,
//                 metadata: {
//                     userId: req.user.id.toString(),
//                 },
//             });
//             stripeCustomerId = customer.id;

//             await User.findByIdAndUpdate(req.user.id, {
//                 stripeCustomerId: customer.id,
//             });
//         }

//         // Create payment intent
//         const paymentIntent = await stripe.paymentIntents.create({
//             amount: amountInCents,
//             currency: process.env.STRIPE_CURRENCY || 'usd',
//             customer: stripeCustomerId,
//             metadata: {
//                 userId: req.user.id.toString(),
//                 type: type === 'ride' ? 'ride_payment' : 'rent car',
//                 referenceId: referenceId,
//             },
//             automatic_payment_methods: {
//                 enabled: true,
//             },
//         });

//         // Create pending transaction
//         const transaction = await Transaction.create({
//             userId: req.user.id,
//             amount: amountInCents,
//             paymentMethod: 'card',
//             type: type === 'ride' ? 'ride_payment' : 'rent car',
//             status: 'pending',
//             rideId: referenceId,
//             bookingId: referenceId,
//             stripePaymentId: paymentIntent.id,
//         });

//         res.json({
//             code: '1',
//             message: req.t('payment.intent.created'),
//             clientSecret: paymentIntent.client_secret,
//             paymentIntentId: paymentIntent.id,
//             transactionId: transaction._id,
//         });
//     } catch (error) {
//         next(error);
//     }
// };

exports.createDirectPayment = async (req, res, next) => {
    try {
        const { amount, type, referenceId, couponCode } = req.body;

        if (!amount || amount <= 0 || !type || !referenceId) {
            return next(createError.BadRequest('Invalid payment details'));
        }

        // Verify the ride/booking exists and belongs to user
        let reference;
        if (type === 'ride') {
            reference = await Ride.findOne({ _id: referenceId });
        } else if (type === 'booking') {
            reference = await Booking.findOne({
                _id: referenceId,
                user: req.user.id,
            }).populate('driver', 'fcmToken name')
                .populate('car', 'name');

            if (!reference) {
                return next(createError.BadRequest('Invalid Booking ID. Please use valid booking.'));
            }
            if (reference.status !== 'accepted' && reference.status !== 'confirmed') {
                return next(createError.BadRequest('Booking must be accepted first'));
            }
            if (reference.paymentStatus === 'completed') {
                return next(createError.BadRequest('Booking already paid'));
            }
        } else {
            return next(createError.BadRequest('Invalid payment type'));
        }

        if (!reference) {
            return next(createError.NotFound(`${type} not found`));
        }

        // ✅ Apply coupon (optional)
        let discount = 0;
        let couponApplied = null;
        let offerId = null;

        if (couponCode) {
            try {
                const result = await applyOfferDiscount({
                    couponCode,
                    amount,
                    type: type === 'ride' ? 'ride' : 'rent',
                    userId: req.user.id,
                });
                discount = result.discount;
                couponApplied = result.couponApplied;
                offerId = result.offerId;
            } catch (couponError) {
                return next(createError.BadRequest(couponError.message));
            }
        }

        const finalAmount = Number((amount - discount).toFixed(2));
        const amountInCents = Math.round(finalAmount * 100);

        // Create or get Stripe customer
        let stripeCustomerId = req.user.stripeCustomerId;

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: req.user.email,
                name: req.user.name,
                metadata: { userId: req.user.id.toString() },
            });
            stripeCustomerId = customer.id;

            await User.findByIdAndUpdate(req.user.id, { stripeCustomerId: customer.id });
        }

        // Create payment intent — charged on discounted amount
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: process.env.STRIPE_CURRENCY || 'usd',
            customer: stripeCustomerId,
            metadata: {
                userId: req.user.id.toString(),
                type: type === 'ride' ? 'ride_payment' : 'rent car',
                referenceId: referenceId,
                couponCode: couponApplied || '',
                offerId: offerId ? offerId.toString() : '',
                discount: discount.toString(),
                originalAmount: amount.toString(),
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        // Create pending transaction
        const transaction = await Transaction.create({
            userId: req.user.id,
            amount: amountInCents,
            paymentMethod: 'card',
            type: type === 'ride' ? 'ride_payment' : 'rent car',
            status: 'pending',
            rideId: referenceId,
            bookingId: referenceId,
            stripePaymentId: paymentIntent.id,
            couponCode: couponApplied || undefined,
            discountAmount: Math.round(discount * 100),
        });

        res.json({
            code: '1',
            message: req.t('payment.intent.created'),
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            transactionId: transaction._id,
            originalAmount: amount,
            discount,
            finalAmount,
            couponApplied,
        });
    } catch (error) {
        next(error);
    }
};

exports.confirmDirectPayment = async (req, res, next) => {
    try {
        const { paymentIntentId } = req.body;

        console.log('==== confirmDirectPayment START ====');
        console.log('PaymentIntent ID:', paymentIntentId);
        console.log('User ID:', req.user?.id);

        if (!paymentIntentId) {
            return next(createError.BadRequest('Payment intent ID is required'));
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        console.log('Stripe Status:', paymentIntent.status);
        console.log('Metadata:', paymentIntent.metadata);

        if (paymentIntent.status !== 'succeeded') {
            return next(createError.BadRequest(`Payment not successful. Current status: ${paymentIntent.status}`));
        }

        const transaction = await Transaction.findOneAndUpdate(
            {
                userId: req.user.id,
                stripePaymentId: paymentIntentId,
                status: 'pending',
            },
            {
                status: 'completed',
                paidAt: new Date()
            },
            { new: true }
        );

        if (!transaction) {
            console.log('❌ Transaction not found');
            return next(createError.NotFound('Transaction not found'));
        }

        console.log('✅ Transaction updated to completed');

        const referenceId = paymentIntent.metadata.referenceId;
        const paymentType = paymentIntent.metadata.type;

        let booking = null;
        let ride = null;

        // ======================== BOOKING / RENT PAYMENT ========================
        if (paymentType === 'rent car' && referenceId) {

            console.log('=== Processing Rent/Booking Payment === ReferenceID:', referenceId);

            await BookingReq.findByIdAndUpdate(referenceId, {
                paymentStatus: 'completed',
                paymentMethod: 'card',
                paidAt: new Date(),
            }).catch(err => console.log('BookingReq update error:', err.message));

            booking = await Booking.findOneAndUpdate(
                { bookingReq: referenceId },
                {
                    paymentStatus: 'completed',
                    paymentMethod: 'card',
                    paidAt: new Date(),
                },
                { new: true }
            ).populate('driver', 'fcmToken name');

            if (!booking) {
                booking = await Booking.findByIdAndUpdate(
                    referenceId,
                    {
                        paymentStatus: 'completed',
                        paymentMethod: 'card',
                        paidAt: new Date(),
                    },
                    { new: true }
                ).populate('driver', 'fcmToken name');
            }

            if (booking) {
                console.log('✅ Main Booking Updated:', booking._id);
                console.log('Driver FCM Token:', booking.driver?.fcmToken);
            } else {
                console.log('⚠️ Booking not found for referenceId:', referenceId);
            }

            const { adminCommission, driverAmount, commissionRate, commissionType } =
                await calculateCommission(paymentIntent.amount, 'rent car');

            if (booking?.driver) {
                const existingWallet = await Wallet.findOne({
                    driverId: booking.driver._id,
                    bookingId: booking._id || referenceId,
                    type: 'add',
                    status: 'completed',
                });

                if (!existingWallet) {
                    await Wallet.create({
                        driverId: booking.driver._id,
                        type: 'add',
                        amount: driverAmount,
                        status: 'completed',
                        bookingId: booking._id || referenceId,
                        description: 'Earnings from car booking (Card Payment)',
                        grossAmount: paymentIntent.amount,
                        adminCommission,
                        commissionRate,
                        commissionType,
                    });
                    console.log('✅ Driver wallet credited');
                }
            }

            try {
                if (req.user?.fcmToken) {
                    await sendNotification(req.user.fcmToken, {
                        title: 'Payment Successful',
                        body: `Your car booking payment has been completed successfully.`,
                        type: 'booking_payment_success'
                    });
                    console.log('✅ User notification sent');
                }

                if (booking?.driver?.fcmToken) {
                    await sendNotification(booking.driver.fcmToken, {
                        title: 'Payment Received',
                        body: `${req.user.name} has paid for the booking.`,
                        type: 'booking_payment_received'
                    });
                    console.log('✅ Driver notification sent to:', booking.driver.fcmToken);
                } else {
                    console.log('⚠️ Driver FCM token missing — notification not sent');
                }
            } catch (notiErr) {
                console.log('Notification error:', notiErr.message);
            }

            if (paymentIntent.metadata.offerId) {
                await recordOfferRedemption({
                    userId: req.user.id,
                    offerId: paymentIntent.metadata.offerId,
                    referenceType: 'rent',
                    referenceId: referenceId,
                    discountAmount: Number(paymentIntent.metadata.discount) || 0,
                });
            }
        }

        // ======================== RIDE PAYMENT ========================
        else if (paymentType === 'ride_payment' && referenceId) {
            console.log('=== Processing Ride Payment === ReferenceID:', referenceId);

            ride = await Ride.findByIdAndUpdate(
                referenceId,
                {
                    paymentStatus: 'completed',
                    paymentMethod: 'card',
                    paidAt: new Date(),
                },
                { new: true }
            ).populate('driver', 'fcmToken name');

            if (!ride) {
                console.log('❌ Ride not found for payment');
            } else {
                console.log('✅ Ride Updated:', ride._id);

                const { adminCommission, driverAmount, commissionRate, commissionType } =
                    await calculateCommission(paymentIntent.amount, 'ride_payment');

                if (ride.driver?._id) {
                    const existingWallet = await Wallet.findOne({
                        driverId: ride.driver._id,
                        rideId: ride._id,
                        type: 'add',
                        status: 'completed',
                    });

                    if (!existingWallet) {
                        await Wallet.create({
                            driverId: ride.driver._id,
                            type: 'add',
                            amount: driverAmount,
                            status: 'completed',
                            rideId: ride._id,
                            description: 'Earnings from ride (Card Payment)',
                            grossAmount: paymentIntent.amount,
                            adminCommission,
                            commissionRate,
                            commissionType,
                        });
                        console.log('✅ Driver wallet credited (Ride)');
                    }
                }

                try {
                    if (req.user?.fcmToken) {
                        await sendNotification(req.user.fcmToken, {
                            title: 'Ride Payment Successful',
                            body: `Your ride payment has been completed successfully.`,
                            type: 'ride_payment_success'
                        });
                        console.log('✅ User notification sent for Ride');
                    }

                    if (ride.driver?.fcmToken) {
                        await sendNotification(ride.driver.fcmToken, {
                            driver: ride.driver._id,
                            title: 'Ride Payment Received',
                            body: `${req.user?.name || 'A user'} has paid for the ride.`,
                            type: 'ride_payment_received'
                        });
                        console.log('✅ Driver notification sent for Ride to:', ride.driver.fcmToken);
                    } else {
                        console.log('⚠️ Driver FCM token not found for ride payment');
                    }
                } catch (notiErr) {
                    console.log('Notification error (Ride):', notiErr.message);
                }

                if (paymentIntent.metadata.offerId) {
                    await recordOfferRedemption({
                        userId: req.user.id,
                        offerId: paymentIntent.metadata.offerId,
                        referenceType: 'ride',
                        referenceId: referenceId,
                        discountAmount: Number(paymentIntent.metadata.discount) || 0,
                    });
                }
            }
        }

        console.log('==== confirmDirectPayment END SUCCESS ====');

        res.json({
            code: '1',
            message: req.t('payment.successful') || 'Payment completed successfully',
            transaction,
            bookingId: booking?._id || (paymentType === 'rent car' ? referenceId : undefined),
            rideId: ride?._id || (paymentType === 'ride_payment' ? referenceId : undefined),
        });

    } catch (error) {
        console.error('❌ confirmDirectPayment Error:', error.message);
        console.error(error);
        next(error);
    }
};
/**
 * Get transaction history
 */
exports.getTransactionHistory = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, type } = req.query;
        const skip = (page - 1) * limit;

        const query = { userId: req.user.id };
        if (type) query.type = type;

        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('rideId', '-__v -otp -user -paymentMethod -isSchedule') // populate ride/booking details
            .select('-__v');

        const total = await Transaction.countDocuments(query);

        transactions.forEach(tx => {
            if (tx.driverAmount !== undefined) {
                tx.driverAmount = (tx.driverAmount / 100).toFixed(2);
            }

            // Admin Commission
            if (tx.adminCommission !== undefined) {
                tx.adminCommission = (tx.adminCommission / 100).toFixed(2);
            }

            if (tx.amount !== undefined) {
                tx.amount = (tx.amount / 100).toFixed(2);
            }
        });

        res.json({
            code: '1',
            message: req.t('success'),
            transactions,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalTransactions: total,
                hasMore: skip + transactions.length < total,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get transaction history – with separate ride & rent details
 */
// exports.getTransactionHistory = async (req, res, next) => {
//     try {
//         const { page = 1, limit = 20 } = req.query;
//         const skip = (parseInt(page) - 1) * parseInt(limit);

//         const pipeline = [
//             { $match: { userId: req.user.id } },
//             { $sort: { createdAt: -1 } },
//             { $skip: skip },
//             { $limit: parseInt(limit) },
//             {
//                 $lookup: {
//                     from: 'rides',               // assuming ride collection name
//                     localField: 'rideId',
//                     foreignField: '_id',
//                     as: 'rideDetails'
//                 }
//             },
//             { $unwind: { path: '$rideDetails', preserveNullAndEmptyArrays: true } },
//             {
//                 $group: {
//                     _id: null,
//                     ride: {
//                         $push: {
//                             $cond: [
//                                 { $in: ['$type', ['ride', 'ride_payment', 'ride_refund']] },
//                                 '$$ROOT',
//                                 null
//                             ]
//                         }
//                     },
//                     rent: {
//                         $push: {
//                             $cond: [
//                                 { $in: ['$type', ['rent', 'rent_payment', 'rent_booking']] },
//                                 '$$ROOT',
//                                 null
//                             ]
//                         }
//                     },
//                     others: { $push: { $cond: [{ $eq: ['$type', 'wallet'] }, '$$ROOT', null] } }
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     ride: { $filter: { input: '$ride', cond: { $ne: ['$$this', null] } } },
//                     rent: { $filter: { input: '$rent', cond: { $ne: ['$$this', null] } } },
//                     others: { $filter: { input: '$others', cond: { $ne: ['$$this', null] } } }
//                 }
//             }
//         ];

//         const result = await Transaction.aggregate(pipeline);

//         const grouped = result[0] || { ride: [], rent: [], others: [] };

//         const total = await Transaction.countDocuments({ userId: req.user.id });

//         res.json({
//             code: '1',
//             message: req.t('success'),
//             data: grouped,
//             pagination: {
//                 currentPage: parseInt(page),
//                 totalPages: Math.ceil(total / limit),
//                 totalTransactions: total,
//                 hasMore: skip + (grouped.ride.length + grouped.rent.length + grouped.others.length) < total,
//             },
//         });
//     } catch (error) {
//         next(error);
//     }
// };
/**
 * Webhook handler for Stripe events (for production use)
 */
exports.stripeWebhook = async (req, res, next) => {
    const sig = req.headers['stripe-signature'];
    console.log('sig: ', sig);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    console.log('webhookSecret: ', webhookSecret);

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        console.log('event: ', event);
    } catch (err) {
        console.log('err: ', err);
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('PaymentIntent was successful!', paymentIntent.id);

            // Update transaction or wallet based on metadata
            if (paymentIntent.metadata.type === 'wallet_topup') {
                await Wallet.findOneAndUpdate(
                    { stripeCustomerId: paymentIntent.id },
                    { status: 'completed' }
                );
            } else {
                // Update transaction status
                const transaction = await Transaction.findOneAndUpdate(
                    { stripePaymentId: paymentIntent.id },
                    { status: 'completed' },
                    { new: true }
                );

                // Credit driver wallet for ride_payment or rent car payments
                if (paymentIntent.metadata.type === 'ride_payment' && paymentIntent.metadata.referenceId) {
                    const ride = await Ride.findById(paymentIntent.metadata.referenceId);
                    if (ride && ride.driver) {
                        const existingWallet = await Wallet.findOne({
                            driverId: ride.driver, rideId: ride._id, type: 'add', status: 'completed',
                        });
                        if (!existingWallet) {
                            const { adminCommission, driverAmount, commissionRate, commissionType } =
                                await calculateCommission(paymentIntent.amount, 'ride_payment');
                            await Wallet.create({
                                driverId: ride.driver,
                                type: 'add',
                                amount: driverAmount,
                                status: 'completed',
                                rideId: ride._id,
                                description: 'Earnings from ride payment (after admin commission)',
                                grossAmount: paymentIntent.amount,
                                adminCommission,
                                commissionRate,
                                commissionType,
                            });
                            await Transaction.findOneAndUpdate(
                                { stripePaymentId: paymentIntent.id },
                                { adminCommission, driverAmount, commissionRate, commissionType }
                            );
                        }
                    }
                } else if (paymentIntent.metadata.type === 'rent car' && paymentIntent.metadata.referenceId) {
                    const booking = await Booking.findById(paymentIntent.metadata.referenceId);
                    if (booking && booking.driver) {
                        const existingWallet = await Wallet.findOne({
                            driverId: booking.driver, bookingId: booking._id, type: 'add', status: 'completed',
                        });
                        if (!existingWallet) {
                            const { adminCommission, driverAmount, commissionRate, commissionType } =
                                await calculateCommission(paymentIntent.amount, 'rent car');
                            await Wallet.create({
                                driverId: booking.driver,
                                type: 'add',
                                amount: driverAmount,
                                status: 'completed',
                                bookingId: booking._id,
                                description: 'Earnings from booking payment (after admin commission)',
                                grossAmount: paymentIntent.amount,
                                adminCommission,
                                commissionRate,
                                commissionType,
                            });
                            await Transaction.findOneAndUpdate(
                                { stripePaymentId: paymentIntent.id },
                                { adminCommission, driverAmount, commissionRate, commissionType, bookingId: booking._id }
                            );
                        }
                    }
                }
            }
            break;

        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            console.log('PaymentIntent failed:', failedPayment.id);

            // Update transaction or wallet to failed
            if (failedPayment.metadata.type === 'wallet_topup') {
                await Wallet.findOneAndUpdate(
                    { stripeCustomerId: failedPayment.id },
                    { status: 'failed' }
                );
            } else {
                await Transaction.findOneAndUpdate(
                    { stripePaymentId: failedPayment.id },
                    { status: 'failed' }
                );
            }
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
};

/**
 * Get saved payment methods
 */
exports.getSavedPaymentMethods = async (req, res, next) => {
    try {
        if (!req.user.stripeCustomerId) {
            return res.json({
                code: '1',
                message: req.t('success'),
                paymentMethods: [],
            });
        }

        const paymentMethods = await stripe.paymentMethods.list({
            customer: req.user.stripeCustomerId,
            type: 'card',
        });

        const formattedMethods = paymentMethods.data.map(pm => ({
            id: pm.id,
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
            isDefault: pm.id === req.user.defaultPaymentMethod,
        }));

        res.json({
            code: '1',
            message: req.t('success'),
            paymentMethods: formattedMethods,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Set default payment method
 */
exports.setDefaultPaymentMethod = async (req, res, next) => {
    try {
        const { paymentMethodId } = req.body;

        if (!paymentMethodId) {
            return next(
                createError.BadRequest('Payment method ID is required')
            );
        }

        // Verify payment method belongs to user
        const paymentMethod = await stripe.paymentMethods.retrieve(
            paymentMethodId
        );

        if (paymentMethod.customer !== req.user.stripeCustomerId) {
            return next(createError.Forbidden('Unauthorized'));
        }

        // Update user's default payment method
        await User.findByIdAndUpdate(req.user.id, {
            defaultPaymentMethod: paymentMethodId,
        });

        res.json({
            code: '1',
            message: req.t('payment.method.updated'),
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete payment method
 */
exports.deletePaymentMethod = async (req, res, next) => {
    try {
        const { paymentMethodId } = req.body;

        if (!paymentMethodId) {
            return next(
                createError.BadRequest('Payment method ID is required')
            );
        }

        // Verify payment method belongs to user
        const paymentMethod = await stripe.paymentMethods.retrieve(
            paymentMethodId
        );

        if (paymentMethod.customer !== req.user.stripeCustomerId) {
            return next(createError.Forbidden('Unauthorized'));
        }

        // Detach payment method
        await stripe.paymentMethods.detach(paymentMethodId);

        // If it was the default, clear it
        if (req.user.defaultPaymentMethod === paymentMethodId) {
            await User.findByIdAndUpdate(req.user.id, {
                defaultPaymentMethod: null,
            });
        }

        res.json({
            code: '1',
            message: req.t('payment.method.deleted'),
        });
    } catch (error) {
        next(error);
    }
};

exports.payRideWithCash = async (req, res, next) => {
    try {
        const { rideId, amount, paymentType, couponCode } = req.body;

        // ✅ Validation
        if (!rideId || !amount || amount <= 0 || paymentType !== 'cash') {
            return next(createError.BadRequest('Invalid payment details'));
        }

        // ✅ Check ride exists
        const ride = await Ride.findById(rideId);
        if (!ride) {
            return next(createError.NotFound('Ride not found'));   
        }

        // ✅ Verify user owns ride
        if (ride.user.toString() !== req.user.id.toString()) {
            return next(createError.Forbidden('Unauthorized'));
        }

        // ✅ Check already paid
        if (ride.paymentStatus === 'completed') {
            return next(createError.BadRequest('Ride already paid'));
        }

        // ✅ Apply coupon (optional)
        let discount = 0;
        let couponApplied = null;
        let offerId = null;

        if (couponCode) {
            try {
                const result = await applyOfferDiscount({
                    couponCode,
                    amount,
                    type: 'ride',
                    userId: req.user.id,
                });
                discount = result.discount;
                couponApplied = result.couponApplied;
                offerId = result.offerId;
            } catch (couponError) {
                return next(createError.BadRequest(couponError.message));
            }
        }

        const finalAmount = Number((amount - discount).toFixed(2));
        const amountInCents = Math.round(finalAmount * 100);

        // ✅ Calculate commission
        const { adminCommission, driverAmount, commissionRate, commissionType } =
            await calculateCommission(amountInCents, 'ride_payment');

        // ✅ Create transaction
        const transaction = await Transaction.create({
            userId: req.user.id,
            amount: amountInCents,
            paymentMethod: 'cash',
            type: 'ride_payment',
            status: 'completed',
            rideId: rideId,
            adminCommission,
            driverAmount,
            commissionRate,
            commissionType,
            couponCode: couponApplied || undefined,
            discountAmount: Math.round(discount * 100),
        });

        // ✅ Credit driver wallet
        if (ride.driver) {
            await Wallet.create({
                driverId: ride.driver,
                type: 'add',
                amount: driverAmount,
                status: 'completed',
                rideId: rideId,
                description: 'Cash ride payment (after admin commission)',
                grossAmount: amountInCents,
                adminCommission,
                commissionRate,
                commissionType,
            });
        }

        // ✅ Record offer redemption
        if (offerId) {
            await recordOfferRedemption({
                userId: req.user.id,
                offerId,
                referenceType: 'ride',
                referenceId: rideId,
                discountAmount: discount,
            });
        }

        // ✅ Update ride payment status
        await Ride.findByIdAndUpdate(rideId, {
            paymentStatus: 'completed',
            paymentMethod: 'cash',
        });

        res.json({
            code: '1',
            message: 'Cash payment completed successfully',
            transaction: {
                id: transaction._id,
                rideId,
                originalAmount: amount,
                discount,
                amount: finalAmount,
                couponApplied,
                paymentType: 'cash',
                createdAt: transaction.createdAt,
            },
        });

    } catch (error) {
        next(error);
    }
};
