// const createError = require('http-errors');
// const Offer = require('../../models/offerModel');
// const OfferRedemption = require('../../models/offerRedemptionModel.js');
// const Charges = require('../../models/chargesModel');
// const UserOfferProgress = require('../../models/userOfferProgressModel');
// const Ride = require('../../models/rideModel');
// const { autoApplyProgressRewards } = require('../../utils/rewardAutoApply');


// // ✅ List offers (green = usable, red = expired/used-up) — for "My Rewards" screen
// // exports.getOffers = async (req, res, next) => {
// //     try {
// //         const now = new Date();
// //         const userId = req.user._id;

// //         // ─── Wallet Balance ───────────────────────────────────────
// //         // Agar req.user me already walletBalance / balance aata hai to use karo
// //         // nahi to User se fetch kar lo
// //         let walletBalance = 0;

// //         if (req.user.walletBalance !== undefined) {
// //             walletBalance = Number(req.user.walletBalance) || 0;
// //         } else if (req.user.balance !== undefined) {
// //             walletBalance = Number(req.user.balance) || 0;
// //         } else {
// //             // fallback – User model se nikaalo
// //             const User = require('../../models/userModel'); // apna path check kar lena
// //             const user = await User.findById(userId).select('walletBalance balance').lean();
// //             walletBalance = Number(user?.walletBalance ?? user?.balance ?? 0);
// //         }
// //         // ─────────────────────────────────────────────────────────

// //         const offers = await Offer.find({ isDeleted: false, isActive: true })
// //             .sort('-createdAt')
// //             .lean();

// //         const offerIds = offers.map(o => o._id);

// //         // Coupon usage
// //         const redemptions = await OfferRedemption.aggregate([
// //             { $match: { userId, offerId: { $in: offerIds } } },
// //             { $group: { _id: '$offerId', count: { $sum: 1 } } },
// //         ]);
// //         const usedMap = {};
// //         redemptions.forEach(r => { usedMap[r._id.toString()] = r.count; });

// //         // Progress docs
// //         const progressDocs = await UserOfferProgress.find({
// //             userId,
// //             offerId: { $in: offerIds },
// //         }).lean();
// //         const progressMap = {};
// //         progressDocs.forEach(p => { progressMap[p.offerId.toString()] = p; });

// //         const formatted = await Promise.all(offers.map(async (offer) => {
// //             const usedByUser = usedMap[offer._id.toString()] || 0;
// //             let status = 'active';
// //             let reason = null;

// //             if (!offer.isActive) {
// //                 status = 'expired';
// //                 reason = 'Inactive';
// //             } else if (now < new Date(offer.validFrom)) {
// //                 status = 'upcoming';
// //                 reason = 'Not started yet';
// //             } else if (now > new Date(offer.validTo)) {
// //                 status = 'expired';
// //                 reason = 'Offer expired';
// //             } else if (offer.offerType === 'coupon') {
// //                 if (offer.usageLimitPerUser > 0 && usedByUser >= offer.usageLimitPerUser) {
// //                     status = 'expired';
// //                     reason = 'Already used';
// //                 }
// //                 if (offer.totalUsageLimit > 0 && offer.totalUsedCount >= offer.totalUsageLimit) {
// //                     status = 'expired';
// //                     reason = 'Offer fully redeemed';
// //                 }
// //             }

// //             const item = {
// //                 _id: offer._id,
// //                 title: offer.title,
// //                 code: offer.code,
// //                 image: offer.image,
// //                 description: offer.description,
// //                 offerType: offer.offerType || 'coupon',
// //                 discountType: offer.discountType,
// //                 discountValue: offer.discountValue,
// //                 minOrderAmount: offer.minOrderAmount,
// //                 applicableOn: offer.applicableOn,
// //                 validTo: offer.validTo,
// //                 status,
// //                 reason,
// //             };

// //             // ★★★ PROGRESS OFFER ★★★
// //             if (offer.offerType === 'progress') {
// //                 let current = 0;
// //                 const target = offer.targetCount || 0;
// //                 let remaining = target;
// //                 let progressText = '';

// //                 if (offer.progressType === 'rides_in_period') {
// //                     current = await getRideCountInPeriod(userId, offer.periodType, offer.validFrom, offer.validTo);
// //                     remaining = Math.max(0, target - current);
// //                     progressText = `${remaining} more rides to earn $${offer.rewardValue || offer.discountValue || 0} bonus`;
// //                 }
// //                 else if (offer.progressType === 'consecutive_days') {
// //                     const prog = progressMap[offer._id.toString()];
// //                     current = prog?.consecutiveDays || 0;
// //                     remaining = Math.max(0, target - current);
// //                     progressText = `${remaining} more day${remaining !== 1 ? 's' : ''} to earn $${offer.rewardValue || offer.discountValue || 0} bonus`;
// //                 }
// //                 else if (offer.progressType === 'rides_in_time_window') {
// //                     const prog = progressMap[offer._id.toString()];
// //                     current = prog?.currentCount || 0;
// //                     remaining = Math.max(0, target - current);
// //                     progressText = `${remaining} more rides to earn $${offer.rewardValue || offer.discountValue || 0} bonus`;
// //                 }

// //                 if (current >= target) {
// //                     status = 'completed';
// //                     reason = 'Reward earned';
// //                 }

// //                 item.progress = {
// //                     current,
// //                     target,
// //                     remaining,
// //                     progressText,
// //                     display: `${String(current).padStart(2, '0')} / ${String(target).padStart(2, '0')}`,
// //                 };
// //                 item.rewardValue = offer.rewardValue || offer.discountValue;
// //                 item.rewardType = offer.rewardType || 'wallet_credit';
// //                 item.progressType = offer.progressType;
// //                 item.status = status;
// //                 item.reason = reason;
// //             }

// //             return item;
// //         }));

// //         // ─── Final Response ───────────────────────────────────────
// //         res.json({
// //             code: '1',
// //             message: req.t('success'),
// //             walletBalance,          // ← yahan wallet balance aa raha hai
// //             offers: formatted,
// //         });
// //     } catch (error) {
// //         next(error);
// //     }
// // };
// exports.getOffers = async (req, res, next) => {
//     try {
//         const now = new Date();
//         const userId = req.user._id;
 
//         // ✅ AUTO APPLY — jo progress rewards earn ho chuke hain wo apne aap wallet me credit
//         // ho jate hain aur history me aa jate hain (alag apply API ki zarurat nahi)
//         try {
//             await autoApplyProgressRewards(userId);
//         } catch (autoErr) {
//             console.error('❌ autoApplyProgressRewards error:', autoErr);
//         }
 
//         const offers = await Offer.find({ isDeleted: false, isActive: true })
//             .sort('-createdAt')
//             .lean();
 
//         const offerIds = offers.map(o => o._id);
 
//         // Coupon usage
//         const redemptions = await OfferRedemption.aggregate([
//             { $match: { userId, offerId: { $in: offerIds } } },
//             { $group: { _id: '$offerId', count: { $sum: 1 } } },
//         ]);
//         const usedMap = {};
//         redemptions.forEach(r => { usedMap[r._id.toString()] = r.count; });
 
//         // Progress docs (for consecutive_days / rides_in_time_window)
//         const progressDocs = await UserOfferProgress.find({
//             userId,
//             offerId: { $in: offerIds },
//         }).lean();
//         const progressMap = {};
//         progressDocs.forEach(p => { progressMap[p.offerId.toString()] = p; });
 
//         const formatted = await Promise.all(offers.map(async (offer) => {
//             const usedByUser = usedMap[offer._id.toString()] || 0;
//             let status = 'active';
//             let reason = null;
 
//             if (!offer.isActive) {
//                 status = 'expired';
//                 reason = 'Inactive';
//             } else if (now < new Date(offer.validFrom)) {
//                 status = 'upcoming';
//                 reason = 'Not started yet';
//             } else if (now > new Date(offer.validTo)) {
//                 status = 'expired';
//                 reason = 'Offer expired';
//             } else if (offer.offerType === 'coupon') {
//                 if (offer.usageLimitPerUser > 0 && usedByUser >= offer.usageLimitPerUser) {
//                     status = 'expired';
//                     reason = 'Already used';
//                 }
//                 if (offer.totalUsageLimit > 0 && offer.totalUsedCount >= offer.totalUsageLimit) {
//                     status = 'expired';
//                     reason = 'Offer fully redeemed';
//                 }
//             }
 
//             const item = {
//                 _id: offer._id,
//                 title: offer.title,
//                 code: offer.code,
//                 image: offer.image,
//                 description: offer.description,
//                 offerType: offer.offerType || 'coupon',
//                 discountType: offer.discountType,
//                 discountValue: offer.discountValue,
//                 minOrderAmount: offer.minOrderAmount,
//                 applicableOn: offer.applicableOn,
//                 validTo: offer.validTo,
//                 status,
//                 reason,
//             };
 
//             // ★★★ PROGRESS OFFER ★★★
//             if (offer.offerType === 'progress') {
//                 let current = 0;
//                 const target = offer.targetCount || 0;
//                 let remaining = target;
//                 let progressText = '';
 
//                 if (offer.progressType === 'rides_in_period') {
//                     current = await getRideCountInPeriod(userId, offer.periodType, offer.validFrom, offer.validTo);
//                     remaining = Math.max(0, target - current);
//                     progressText = `${remaining} more rides to earn $${offer.rewardValue || offer.discountValue || 0} bonus`;
//                 }
//                 else if (offer.progressType === 'consecutive_days') {
//                     const prog = progressMap[offer._id.toString()];
//                     current = prog?.consecutiveDays || 0;
//                     remaining = Math.max(0, target - current);
//                     progressText = `${remaining} more day${remaining !== 1 ? 's' : ''} to earn $${offer.rewardValue || offer.discountValue || 0} bonus`;
//                 }
//                 else if (offer.progressType === 'rides_in_time_window') {
//                     const prog = progressMap[offer._id.toString()];
//                     current = prog?.currentCount || 0;
//                     remaining = Math.max(0, target - current);
//                     progressText = `${remaining} more rides to earn $${offer.rewardValue || offer.discountValue || 0} bonus`;
//                 }
 
//                 // ✅ Reward auto apply ho chuka ho to completed dikhao
//                 const claimed = !!(progressMap[offer._id.toString()] && progressMap[offer._id.toString()].rewardClaimed);
//                 if (claimed) {
//                     current = target;
//                     remaining = 0;
//                     progressText = 'Reward credited to your wallet';
//                 }
 
//                 if (current >= target) {
//                     status = 'completed';
//                     reason = claimed ? 'Reward credited to your wallet' : 'Reward earned';
//                 }
//                 item.rewardClaimed = claimed;
 
//                 item.progress = {
//                     current,
//                     target,
//                     remaining,
//                     progressText,
//                     display: `${String(current).padStart(2, '0')} / ${String(target).padStart(2, '0')}`,
//                 };
//                 item.rewardValue = offer.rewardValue || offer.discountValue;
//                 item.rewardType = offer.rewardType || 'wallet_credit';
//                 item.progressType = offer.progressType;
//                 item.status = status;
//                 item.reason = reason;
//             }
 
//             return item;
//         }));
 
//         res.json({ code: '1', message: req.t('success'), offers: formatted });
//     } catch (error) {
//         next(error);
//     }
// };

// // Helper — completed rides count in the current week/month window.
// // IMPORTANT: field names MUST match the Ride schema exactly —
// // it's `user` (not `userId`) and status is `'Completed'` (capital C).
// async function getRideCountInPeriod(userId, periodType, validFrom, validTo) {
//     const now = new Date();
//     let start;

//     if (periodType === 'month') {
//         start = new Date(now.getFullYear(), now.getMonth(), 1);
//     } else if (periodType === 'week') {
//         const day = now.getDay();
//         start = new Date(now);
//         start.setDate(now.getDate() - day);
//         start.setHours(0, 0, 0, 0);
//     } else {
//         start = new Date(validFrom);
//     }

//     const end = new Date(Math.min(now.getTime(), new Date(validTo).getTime()));

//     return Ride.countDocuments({
//         user: userId,
//         status: 'Completed',
//         createdAt: { $gte: start, $lte: end },
//     });
// }

// // Called from Driver's completeRide once a ride is marked Completed —
// // advances progress for every active 'progress' type offer.
// exports.updateOfferProgress = async (userId, ride) => {
//     const now = new Date();

//     const progressOffers = await Offer.find({
//         offerType: 'progress',
//         isActive: true,
//         isDeleted: false,
//         validFrom: { $lte: now },
//         validTo: { $gte: now },
//     });

//     for (const offer of progressOffers) {
//         let progress = await UserOfferProgress.findOne({ userId, offerId: offer._id });

//         if (!progress) {
//             progress = new UserOfferProgress({ userId, offerId: offer._id });
//         }

//         if (progress.isCompleted) continue;

//         if (offer.progressType === 'rides_in_period') {
//             // getOffers computes this in real-time via getRideCountInPeriod;
//             // nothing to persist here.
//         }
//         else if (offer.progressType === 'consecutive_days') {
//             const rideDate = new Date(ride.completedAt || ride.createdAt).setHours(0, 0, 0, 0);
//             const lastDate = progress.lastRideDate
//                 ? new Date(progress.lastRideDate).setHours(0, 0, 0, 0)
//                 : null;

//             if (!lastDate) {
//                 progress.consecutiveDays = 1;
//             } else {
//                 const diffDays = Math.round((rideDate - lastDate) / (1000 * 60 * 60 * 24));
//                 if (diffDays === 1) {
//                     progress.consecutiveDays += 1;
//                 } else if (diffDays > 1) {
//                     progress.consecutiveDays = 1; // streak broken
//                 }
//                 // same day → no change
//             }
//             progress.lastRideDate = ride.completedAt || ride.createdAt;
//         }
//         else if (offer.progressType === 'rides_in_time_window') {
//             const rideTimeObj = new Date(ride.completedAt || ride.createdAt);
//             const rideTime = rideTimeObj.getHours() * 60 + rideTimeObj.getMinutes();

//             const [sH, sM] = (offer.timeWindowStart || '00:00').split(':').map(Number);
//             const [eH, eM] = (offer.timeWindowEnd || '23:59').split(':').map(Number);
//             const startMin = sH * 60 + sM;
//             const endMin = eH * 60 + eM;

//             if (rideTime >= startMin && rideTime <= endMin) {
//                 progress.currentCount = (progress.currentCount || 0) + 1;
//             }
//         }

//         const current = offer.progressType === 'consecutive_days'
//             ? (progress.consecutiveDays || 0)
//             : (progress.currentCount || 0);

//         if (current >= offer.targetCount) {
//             progress.isCompleted = true;
//             progress.completedAt = now;
//             // TODO: wallet credit here — await creditWallet(userId, offer.rewardValue, `Reward: ${offer.title}`);
//         }

//         await progress.save();
//     }
// };

// // ✅ Validate & calculate discount — call this BEFORE payment (on fare-details screen, coupon field)
// exports.applyOffer = async (req, res, next) => {
//     try {
//         const { code, amount, type } = req.body; // type: 'ride' | 'rent'

//         if (!code) return next(createError.BadRequest('Coupon code is required.'));
//         if (!amount || amount <= 0) return next(createError.BadRequest('Invalid amount.'));
//         if (!['ride', 'rent'].includes(type)) return next(createError.BadRequest('type must be "ride" or "rent".'));

//         const offer = await Offer.findOne({ code: code.toUpperCase().trim(), isDeleted: false });
//         if (!offer) return next(createError.BadRequest('Invalid coupon code.'));

//         const now = new Date();
//         if (!offer.isActive) return next(createError.BadRequest('This offer is not active.'));
//         if (now < offer.validFrom || now > offer.validTo)
//             return next(createError.BadRequest('This offer has expired.'));
//         if (offer.applicableOn !== 'all' && offer.applicableOn !== type)
//             return next(createError.BadRequest(`This offer is not applicable on ${type}.`));
//         if (amount < offer.minOrderAmount)
//             return next(createError.BadRequest(`Minimum amount for this offer is ₹${offer.minOrderAmount}.`));

//         if (offer.totalUsageLimit > 0 && offer.totalUsedCount >= offer.totalUsageLimit)
//             return next(createError.BadRequest('This offer has been fully redeemed.'));

//         if (offer.usageLimitPerUser > 0) {
//             const usedByUser = await OfferRedemption.countDocuments({ userId: req.user.id, offerId: offer._id });
//             if (usedByUser >= offer.usageLimitPerUser)
//                 return next(createError.BadRequest('You have already used this offer.'));
//         }

//         // Calculate discount
//         let discount = offer.discountType === 'flat'
//             ? offer.discountValue
//             : (amount * offer.discountValue) / 100;

//         if (offer.discountType === 'percentage' && offer.maxDiscount > 0)
//             discount = Math.min(discount, offer.maxDiscount);

//         discount = Math.min(discount, amount); // discount can't exceed total amount
//         discount = Number(discount.toFixed(2));

//         const finalAmount = Number((amount - discount).toFixed(2));

//         res.json({
//             code: '1',
//             message: 'Offer applied successfully',
//             data: {
//                 offerId: offer._id,
//                 offerCode: offer.code,
//                 originalAmount: amount,
//                 discount,
//                 finalAmount,
//             },
//         });
//     } catch (error) {
//         next(error);
//     }
// };

// // ✅ Refer & Earn details — user ka referral code + program config
// exports.getReferEarn = async (req, res, next) => {
//     try {
//         const charges = await Charges.findOne();

//         res.json({
//             code: '1',
//             message: req.t('success'),
//             data: {
//                 referralCode: req.user.referralCode || null,
//                 minimumFare: Number(charges?.referralMinFare) || 0,
//                 earnValue: Number(charges?.referralEarnValue) || 0,
//             },
//         });
//     } catch (error) {
//         console.error('❌ getReferEarn Error:', error);
//         next(error);
//     }
// };

// // ✅ Reward History — with overall total saved (across all pages)
// exports.getRewardHistory = async (req, res, next) => {
//     try {
//         const { page = 1, limit = 20 } = req.query;
//         const skip = (page - 1) * limit;

//         const [redemptions, total, totalAgg] = await Promise.all([
//             OfferRedemption.find({ userId: req.user.id })
//                 .populate('offerId', 'title code image discountType discountValue')
//                 .sort('-createdAt')
//                 .skip(skip)
//                 .limit(parseInt(limit))
//                 .lean(),
//             OfferRedemption.countDocuments({ userId: req.user.id }),
//             OfferRedemption.aggregate([
//                 { $match: { userId: req.user._id } },
//                 { $group: { _id: null, total: { $sum: '$discountAmount' } } },
//             ]),
//         ]);

//         const history = redemptions.map(r => ({
//             _id: r._id,
//             offerTitle: r.offerId?.title || 'Offer',
//             offerCode: r.offerId?.code || null,
//             offerImage: r.offerId?.image || null,
//             discountAmount: r.discountAmount,
//             usedOn: r.referenceType,
//             referenceId: r.referenceId,
//             date: r.createdAt,
//         }));

//         res.json({
//             code: '1',
//             message: req.t('success'),
//             totalSaved: totalAgg[0]?.total || 0,   // ✅ overall total, sab redemptions ka
//             history,
//             pagination: {
//                 currentPage: parseInt(page),
//                 totalPages: Math.ceil(total / limit),
//                 totalRecords: total,
//                 hasMore: skip + history.length < total,
//             },
//         });
//     } catch (error) {
//         console.error('❌ getRewardHistory Error:', error);
//         next(error);
//     }
// };



const createError = require('http-errors');
const Offer = require('../../models/offerModel');
const OfferRedemption = require('../../models/offerRedemptionModel.js');
const Charges = require('../../models/chargesModel');
const UserOfferProgress = require('../../models/userOfferProgressModel');
const Ride = require('../../models/rideModel');
const Wallet = require('../../models/wallet');
const User = require("../../models/userModel.js")
const { autoApplyProgressRewards, getRideCountInPeriod } = require('../../utils/rewardAutoApply');


// ✅ List offers (green = usable, red = expired/used-up) — for "My Rewards" screen
// exports.getOffers = async (req, res, next) => {
//     try {
//         const now = new Date();
//         const userId = req.user._id;

//         // ─── Wallet Balance ───────────────────────────────────────
//         // Agar req.user me already walletBalance / balance aata hai to use karo
//         // nahi to User se fetch kar lo
//         let walletBalance = 0;

//         if (req.user.walletBalance !== undefined) {
//             walletBalance = Number(req.user.walletBalance) || 0;
//         } else if (req.user.balance !== undefined) {
//             walletBalance = Number(req.user.balance) || 0;
//         } else {
//             // fallback – User model se nikaalo
//             const User = require('../../models/userModel'); // apna path check kar lena
//             const user = await User.findById(userId).select('walletBalance balance').lean();
//             walletBalance = Number(user?.walletBalance ?? user?.balance ?? 0);
//         }
//         // ─────────────────────────────────────────────────────────

//         const offers = await Offer.find({ isDeleted: false, isActive: true })
//             .sort('-createdAt')
//             .lean();

//         const offerIds = offers.map(o => o._id);

//         // Coupon usage
//         const redemptions = await OfferRedemption.aggregate([
//             { $match: { userId, offerId: { $in: offerIds } } },
//             { $group: { _id: '$offerId', count: { $sum: 1 } } },
//         ]);
//         const usedMap = {};
//         redemptions.forEach(r => { usedMap[r._id.toString()] = r.count; });

//         // Progress docs
//         const progressDocs = await UserOfferProgress.find({
//             userId,
//             offerId: { $in: offerIds },
//         }).lean();
//         const progressMap = {};
//         progressDocs.forEach(p => { progressMap[p.offerId.toString()] = p; });

//         const formatted = await Promise.all(offers.map(async (offer) => {
//             const usedByUser = usedMap[offer._id.toString()] || 0;
//             let status = 'active';
//             let reason = null;

//             if (!offer.isActive) {
//                 status = 'expired';
//                 reason = 'Inactive';
//             } else if (now < new Date(offer.validFrom)) {
//                 status = 'upcoming';
//                 reason = 'Not started yet';
//             } else if (now > new Date(offer.validTo)) {
//                 status = 'expired';
//                 reason = 'Offer expired';
//             } else if (offer.offerType === 'coupon') {
//                 if (offer.usageLimitPerUser > 0 && usedByUser >= offer.usageLimitPerUser) {
//                     status = 'expired';
//                     reason = 'Already used';
//                 }
//                 if (offer.totalUsageLimit > 0 && offer.totalUsedCount >= offer.totalUsageLimit) {
//                     status = 'expired';
//                     reason = 'Offer fully redeemed';
//                 }
//             }

//             const item = {
//                 _id: offer._id,
//                 title: offer.title,
//                 code: offer.code,
//                 image: offer.image,
//                 description: offer.description,
//                 offerType: offer.offerType || 'coupon',
//                 discountType: offer.discountType,
//                 discountValue: offer.discountValue,
//                 minOrderAmount: offer.minOrderAmount,
//                 applicableOn: offer.applicableOn,
//                 validTo: offer.validTo,
//                 status,
//                 reason,
//             };

//             // ★★★ PROGRESS OFFER ★★★
//             if (offer.offerType === 'progress') {
//                 let current = 0;
//                 const target = offer.targetCount || 0;
//                 let remaining = target;
//                 let progressText = '';

//                 if (offer.progressType === 'rides_in_period') {
//                     current = await getRideCountInPeriod(userId, offer.periodType, offer.validFrom, offer.validTo);
//                     remaining = Math.max(0, target - current);
//                     progressText = `${remaining} more rides to earn $${offer.rewardValue || offer.discountValue || 0} bonus`;
//                 }
//                 else if (offer.progressType === 'consecutive_days') {
//                     const prog = progressMap[offer._id.toString()];
//                     current = prog?.consecutiveDays || 0;
//                     remaining = Math.max(0, target - current);
//                     progressText = `${remaining} more day${remaining !== 1 ? 's' : ''} to earn $${offer.rewardValue || offer.discountValue || 0} bonus`;
//                 }
//                 else if (offer.progressType === 'rides_in_time_window') {
//                     const prog = progressMap[offer._id.toString()];
//                     current = prog?.currentCount || 0;
//                     remaining = Math.max(0, target - current);
//                     progressText = `${remaining} more rides to earn $${offer.rewardValue || offer.discountValue || 0} bonus`;
//                 }

//                 if (current >= target) {
//                     status = 'completed';
//                     reason = 'Reward earned';
//                 }

//                 item.progress = {
//                     current,
//                     target,
//                     remaining,
//                     progressText,
//                     display: `${String(current).padStart(2, '0')} / ${String(target).padStart(2, '0')}`,
//                 };
//                 item.rewardValue = offer.rewardValue || offer.discountValue;
//                 item.rewardType = offer.rewardType || 'wallet_credit';
//                 item.progressType = offer.progressType;
//                 item.status = status;
//                 item.reason = reason;
//             }

//             return item;
//         }));

//         // ─── Final Response ───────────────────────────────────────
//         res.json({
//             code: '1',
//             message: req.t('success'),
//             walletBalance,          // ← yahan wallet balance aa raha hai
//             offers: formatted,
//         });
//     } catch (error) {
//         next(error);
//     }
// };
exports.getOffers = async (req, res, next) => {
    try {
        const now = new Date();
        const userId = req.user._id;
 
        // ✅ AUTO APPLY — jo progress rewards earn ho chuke hain wo apne aap wallet me credit
        // ho jate hain aur history me aa jate hain (alag apply API ki zarurat nahi)
        try {
            await autoApplyProgressRewards(userId);
        } catch (autoErr) {
            console.error('❌ autoApplyProgressRewards error:', autoErr);
        }
 
        const offers = await Offer.find({ isDeleted: false, isActive: true })
            .sort('-createdAt')
            .lean();
 
        const offerIds = offers.map(o => o._id);
 
        // Coupon usage
        const redemptions = await OfferRedemption.aggregate([
            { $match: { userId, offerId: { $in: offerIds } } },
            { $group: { _id: '$offerId', count: { $sum: 1 } } },
        ]);
        const usedMap = {};
        redemptions.forEach(r => { usedMap[r._id.toString()] = r.count; });
 
        // Progress docs (for consecutive_days / rides_in_time_window)
        const progressDocs = await UserOfferProgress.find({
            userId,
            offerId: { $in: offerIds },
        }).lean();
        const progressMap = {};
        progressDocs.forEach(p => { progressMap[p.offerId.toString()] = p; });
 
        const formatted = await Promise.all(offers.map(async (offer) => {
            const usedByUser = usedMap[offer._id.toString()] || 0;
            let status = 'active';
            let reason = null;
 
            if (!offer.isActive) {
                status = 'expired';
                reason = 'Inactive';
            } else if (now < new Date(offer.validFrom)) {
                status = 'upcoming';
                reason = 'Not started yet';
            } else if (now > new Date(offer.validTo)) {
                status = 'expired';
                reason = 'Offer expired';
            } else if (offer.offerType === 'coupon') {
                if (offer.usageLimitPerUser > 0 && usedByUser >= offer.usageLimitPerUser) {
                    status = 'expired';
                    reason = 'Already used';
                }
                if (offer.totalUsageLimit > 0 && offer.totalUsedCount >= offer.totalUsageLimit) {
                    status = 'expired';
                    reason = 'Offer fully redeemed';
                }
            }
 
            const item = {
                _id: offer._id,
                title: offer.title,
                code: offer.code,
                image: offer.image,
                description: offer.description,
                offerType: offer.offerType || 'coupon',
                discountType: offer.discountType,
                discountValue: offer.discountValue,
                minOrderAmount: offer.minOrderAmount,
                applicableOn: offer.applicableOn,
                validTo: offer.validTo,
                status,
                reason,
            };
 
            // ★★★ PROGRESS OFFER ★★★
            if (offer.offerType === 'progress') {
                let current = 0;
                const target = offer.targetCount || 0;
                let remaining = target;
                let progressText = '';
 
                if (offer.progressType === 'rides_in_period') {
                    current = await getRideCountInPeriod(userId, offer.periodType, offer.validFrom, offer.validTo);
                    remaining = Math.max(0, target - current);
                    progressText = `${remaining} more rides to earn $${offer.rewardValue || offer.discountValue || 0} bonus`;
                }
                else if (offer.progressType === 'consecutive_days') {
                    const prog = progressMap[offer._id.toString()];
                    current = prog?.consecutiveDays || 0;
                    remaining = Math.max(0, target - current);
                    progressText = `${remaining} more day${remaining !== 1 ? 's' : ''} to earn $${offer.rewardValue || offer.discountValue || 0} bonus`;
                }
                else if (offer.progressType === 'rides_in_time_window') {
                    const prog = progressMap[offer._id.toString()];
                    current = prog?.currentCount || 0;
                    remaining = Math.max(0, target - current);
                    progressText = `${remaining} more rides to earn $${offer.rewardValue || offer.discountValue || 0} bonus`;
                }
 
                // ✅ Reward auto apply ho chuka ho to completed dikhao
                const claimed = !!(progressMap[offer._id.toString()] && progressMap[offer._id.toString()].rewardClaimed);
                if (claimed) {
                    current = target;
                    remaining = 0;
                    progressText = 'Reward credited to your wallet';
                }
 
                if (current >= target) {
                    status = 'completed';
                    reason = claimed ? 'Reward credited to your wallet' : 'Reward earned';
                }
                item.rewardClaimed = claimed;
 
                item.progress = {
                    current,
                    target,
                    remaining,
                    progressText,
                    display: `${String(current).padStart(2, '0')} / ${String(target).padStart(2, '0')}`,
                };
                item.rewardValue = offer.rewardValue || offer.discountValue;
                item.rewardType = offer.rewardType || 'wallet_credit';
                item.progressType = offer.progressType;
                item.status = status;
                item.reason = reason;
            }
 
            return item;
        }));
 
        // ✅ WALLET BALANCE — autoApply ke BAAD calculate hota hai, isliye abhi credit hua reward bhi include hai.
        // Logic Paymentcontroller jaisa hi: completed 'add' minus completed 'use' (paise -> dollar).
        const walletAgg = await Wallet.aggregate([
            { $match: { userId, status: 'completed', type: { $in: ['add', 'use'] } } },
            {
                $group: {
                    _id: null,
                    total: { $sum: { $cond: [{ $eq: ['$type', 'add'] }, '$amount', { $multiply: ['$amount', -1] }] } },
                },
            },
        ]);
        const walletBalance = (walletAgg[0]?.total || 0) / 100;

        res.json({ code: '1', message: req.t('success'), walletBalance, offers: formatted });
    } catch (error) {
        next(error);
    }
};

// getRideCountInPeriod ab utils/rewardAutoApply.js se aata hai (ek hi logic, dono jagah same).

// Called from Driver's completeRide once a ride is marked Completed —
// advances progress for every active 'progress' type offer.
exports.updateOfferProgress = async (userId, ride) => {
    const now = new Date();

    const progressOffers = await Offer.find({
        offerType: 'progress',
        isActive: true,
        isDeleted: false,
        validFrom: { $lte: now },
        validTo: { $gte: now },
    });

    for (const offer of progressOffers) {
        let progress = await UserOfferProgress.findOne({ userId, offerId: offer._id });

        if (!progress) {
            progress = new UserOfferProgress({ userId, offerId: offer._id });
        }

        if (progress.isCompleted) continue;

        if (offer.progressType === 'rides_in_period') {
            // getOffers computes this in real-time via getRideCountInPeriod;
            // nothing to persist here.
        }
        else if (offer.progressType === 'consecutive_days') {
            const rideDate = new Date(ride.completedAt || ride.createdAt).setHours(0, 0, 0, 0);
            const lastDate = progress.lastRideDate
                ? new Date(progress.lastRideDate).setHours(0, 0, 0, 0)
                : null;

            if (!lastDate) {
                progress.consecutiveDays = 1;
            } else {
                const diffDays = Math.round((rideDate - lastDate) / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    progress.consecutiveDays += 1;
                } else if (diffDays > 1) {
                    progress.consecutiveDays = 1; // streak broken
                }
                // same day → no change
            }
            progress.lastRideDate = ride.completedAt || ride.createdAt;
        }
        else if (offer.progressType === 'rides_in_time_window') {
            const rideTimeObj = new Date(ride.completedAt || ride.createdAt);
            const rideTime = rideTimeObj.getHours() * 60 + rideTimeObj.getMinutes();

            const [sH, sM] = (offer.timeWindowStart || '00:00').split(':').map(Number);
            const [eH, eM] = (offer.timeWindowEnd || '23:59').split(':').map(Number);
            const startMin = sH * 60 + sM;
            const endMin = eH * 60 + eM;

            if (rideTime >= startMin && rideTime <= endMin) {
                progress.currentCount = (progress.currentCount || 0) + 1;
            }
        }

        const current = offer.progressType === 'consecutive_days'
            ? (progress.consecutiveDays || 0)
            : (progress.currentCount || 0);

        if (current >= offer.targetCount) {
            progress.isCompleted = true;
            progress.completedAt = now;
            // TODO: wallet credit here — await creditWallet(userId, offer.rewardValue, `Reward: ${offer.title}`);
        }

        await progress.save();
    }
};

// ✅ Validate & calculate discount — call this BEFORE payment (on fare-details screen, coupon field)
exports.applyOffer = async (req, res, next) => {
    try {
        const { code, amount, type } = req.body; // type: 'ride' | 'rent'

        if (!code) return next(createError.BadRequest('Coupon code is required.'));
        if (!amount || amount <= 0) return next(createError.BadRequest('Invalid amount.'));
        if (!['ride', 'rent'].includes(type)) return next(createError.BadRequest('type must be "ride" or "rent".'));

        const offer = await Offer.findOne({ code: code.toUpperCase().trim(), isDeleted: false });
        if (!offer) return next(createError.BadRequest('Invalid coupon code.'));

        const now = new Date();
        if (!offer.isActive) return next(createError.BadRequest('This offer is not active.'));
        if (now < offer.validFrom || now > offer.validTo)
            return next(createError.BadRequest('This offer has expired.'));
        if (offer.applicableOn !== 'all' && offer.applicableOn !== type)
            return next(createError.BadRequest(`This offer is not applicable on ${type}.`));
        if (amount < offer.minOrderAmount)
            return next(createError.BadRequest(`Minimum amount for this offer is ₹${offer.minOrderAmount}.`));

        if (offer.totalUsageLimit > 0 && offer.totalUsedCount >= offer.totalUsageLimit)
            return next(createError.BadRequest('This offer has been fully redeemed.'));

        if (offer.usageLimitPerUser > 0) {
            const usedByUser = await OfferRedemption.countDocuments({ userId: req.user.id, offerId: offer._id });
            if (usedByUser >= offer.usageLimitPerUser)
                return next(createError.BadRequest('You have already used this offer.'));
        }

        // Calculate discount
        let discount = offer.discountType === 'flat'
            ? offer.discountValue
            : (amount * offer.discountValue) / 100;

        if (offer.discountType === 'percentage' && offer.maxDiscount > 0)
            discount = Math.min(discount, offer.maxDiscount);

        discount = Math.min(discount, amount); // discount can't exceed total amount
        discount = Number(discount.toFixed(2));

        const finalAmount = Number((amount - discount).toFixed(2));

        res.json({
            code: '1',
            message: 'Offer applied successfully',
            data: {
                offerId: offer._id,
                offerCode: offer.code,
                originalAmount: amount,
                discount,
                finalAmount,
            },
        });
    } catch (error) {
        next(error);
    }
};



// ✅ Refer & Earn details — user ka referral code + program config
exports.getReferEarn = async (req, res, next) => {
    try {
        const charges = await Charges.findOne();

        // req.user me select() ki wajah se field na aaye, isliye DB se seedha lo
        const dbUser = await User.findById(req.user._id).select('name myReferralCode');
        let referralCode = dbUser?.myReferralCode || null;

        // Pehli baar (ya purane users) — unique code generate karke save karo
        if (!referralCode && dbUser) {
            const prefix = String(dbUser.name || 'USER').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X');
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            for (let attempt = 0; attempt < 10 && !referralCode; attempt++) {
                let suffix = '';
                for (let k = 0; k < 4; k++) suffix += chars[Math.floor(Math.random() * chars.length)];
                const candidate = prefix + suffix;
                const exists = await User.exists({ myReferralCode: candidate });
                if (!exists) {
                    try {
                        await User.updateOne({ _id: dbUser._id }, { $set: { myReferralCode: candidate } });
                        referralCode = candidate;
                    } catch (e) {
                        if (e.code !== 11000) throw e; // duplicate -> dobara try
                    }
                }
            }
        }

        res.json({
            code: '1',
            message: req.t('success'),
            data: {
                referralCode,
                minimumFare: Number(charges?.referralMinFare) || 0,
                earnValue: Number(charges?.referralEarnValue) || 0,
            },
        });
    } catch (error) {
        console.error('❌ getReferEarn Error:', error);
        next(error);
    }
};

// // ✅ Reward History — with overall total saved (across all pages)
// exports.getRewardHistory = async (req, res, next) => {
//     try {
//         const { page = 1, limit = 20 } = req.query;
//         const skip = (page - 1) * limit;

//         const [redemptions, total, totalAgg] = await Promise.all([
//             OfferRedemption.find({ userId: req.user.id })
//                 .populate('offerId', 'title code image discountType discountValue')
//                 .sort('-createdAt')
//                 .skip(skip)
//                 .limit(parseInt(limit))
//                 .lean(),
//             OfferRedemption.countDocuments({ userId: req.user.id }),
//             OfferRedemption.aggregate([
//                 { $match: { userId: req.user._id } },
//                 { $group: { _id: null, total: { $sum: '$discountAmount' } } },
//             ]),
//         ]);

//         const history = redemptions.map(r => ({
//             _id: r._id,
//             offerTitle: r.offerId?.title || 'Offer',
//             offerCode: r.offerId?.code || null,
//             offerImage: r.offerId?.image || null,
//             discountAmount: r.discountAmount,
//             usedOn: r.referenceType,
//             referenceId: r.referenceId,
//             date: r.createdAt,
//         }));

//         res.json({
//             code: '1',
//             message: req.t('success'),
//             totalSaved: totalAgg[0]?.total || 0,   // ✅ overall total, sab redemptions ka
//             history,
//             pagination: {
//                 currentPage: parseInt(page),
//                 totalPages: Math.ceil(total / limit),
//                 totalRecords: total,
//                 hasMore: skip + history.length < total,
//             },
//         });
//     } catch (error) {
//         console.error('❌ getRewardHistory Error:', error);
//         next(error);
//     }
// };


// ✅ Reward History — with overall total saved (across all pages)
exports.getRewardHistory = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const [redemptions, total, totalAgg] = await Promise.all([
            OfferRedemption.find({ userId: req.user.id })
                .populate('offerId') // offer ka poora data (description, validity, progress fields, sab kuch)
                .sort('-createdAt')
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            OfferRedemption.countDocuments({ userId: req.user.id }),
            OfferRedemption.aggregate([
                { $match: { userId: req.user._id } },
                { $group: { _id: null, total: { $sum: '$discountAmount' } } },
            ]),
        ]);

        const history = redemptions.map(r => {
            const o = r.offerId || null;
            return {
                _id: r._id,

                // purane flat fields (app me use ho rahe hon to break na ho)
                offerTitle: o?.title || 'Offer',
                offerCode: o?.code || null,
                offerImage: o?.image || null,
                discountAmount: r.discountAmount,
                usedOn: r.referenceType,
                referenceId: r.referenceId,
                date: r.createdAt,

                // redemption ka poora data
                offerId: o?._id || null,
                userId: r.userId,
                referenceType: r.referenceType,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,

                // offer ka poora data
                offerDescription: o?.description || null,
                offer: o
                    ? {
                          _id: o._id,
                          title: o.title,
                          code: o.code,
                          image: o.image,
                          description: o.description,
                          offerType: o.offerType || 'coupon',
                          discountType: o.discountType,
                          discountValue: o.discountValue,
                          maxDiscount: o.maxDiscount,
                          minOrderAmount: o.minOrderAmount,
                          applicableOn: o.applicableOn,
                          validFrom: o.validFrom,
                          validTo: o.validTo,
                          usageLimitPerUser: o.usageLimitPerUser,
                          totalUsageLimit: o.totalUsageLimit,
                          totalUsedCount: o.totalUsedCount,
                          isActive: o.isActive,
                          // progress-reward offers ke liye
                          progressType: o.progressType || null,
                          periodType: o.periodType || null,
                          targetCount: o.targetCount || 0,
                          rewardValue: o.rewardValue || 0,
                          rewardType: o.rewardType || null,
                          timeWindowStart: o.timeWindowStart || null,
                          timeWindowEnd: o.timeWindowEnd || null,
                      }
                    : null,
            };
        });

        res.json({
            code: '1',
            message: req.t('success'),
            totalSaved: totalAgg[0]?.total || 0,   // ✅ overall total, sab redemptions ka
            history,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalRecords: total,
                hasMore: skip + history.length < total,
            },
        });
    } catch (error) {
        console.error('❌ getRewardHistory Error:', error);
        next(error);
    }
};

