// =====================================================================
// My Rewards — progress rewards AUTO APPLY
//
// "Complete 20 rides in a month" jaise progress offer ka target pura hote hi
// reward apne aap user ke wallet me credit ho jata hai (koi alag apply API nahi),
// aur Reward History me entry aa jati hai.
//
// Kab chalta hai:
//   1) Driver ride complete kare (completeRide)   -> autoApplyProgressRewards(userId)
//   2) User GET /api/user/rewards khole           -> autoApplyProgressRewards(userId)  (catch-up)
//
// Safety:
//   - UserOfferProgress.rewardClaimed ko atomic update se set kiya jata hai,
//     isliye ek user ko ek offer ka reward sirf ek baar milta hai (dobara call par bhi).
//   - Wallet credit fail ho to claim wapas hat jata hai (next time retry).
//   - Offer.totalUsageLimit ho to wo bhi respect hota hai.
// =====================================================================

const Offer = require('../models/offerModel');
const UserOfferProgress = require('../models/userOfferProgressModel');
const OfferRedemption = require('../models/offerRedemptionModel');
const Wallet = require('../models/wallet');
const Ride = require('../models/rideModel');

// Current week/month me user ki completed rides (rewardController bhi yahi helper use karta hai)
// - Ride ka completion time (completedAt) dekha jata hai; purani rides jinme completedAt nahi hai
//   unke liye createdAt fallback hai.
// - Window ka end = ab (validTo se cap NAHI) — offer expire hone par bhi uske period me hui
//   rides count hoti hain. Sirf period ke andar ki rides hi aati hain.
async function getRideCountInPeriod(userId, periodType, validFrom, validTo) {
    const now = new Date();
    let start;

    if (periodType === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (periodType === 'week') {
        const day = now.getDay();
        start = new Date(now);
        start.setDate(now.getDate() - day);
        start.setHours(0, 0, 0, 0);
    } else {
        start = new Date(validFrom);
    }

    const end = now;
    const range = { $gte: start, $lte: end };

    return Ride.countDocuments({
        user: userId,
        status: 'Completed',
        $or: [
            { completedAt: range },
            { completedAt: null, createdAt: range }, // completedAt missing/null (purani rides)
        ],
    });
}

// Offer ka current progress (getOffers jaisa logic)
async function getCurrentProgress(userId, offer, progressDoc) {
    if (offer.progressType === 'rides_in_period')
        return getRideCountInPeriod(userId, offer.periodType, offer.validFrom, offer.validTo);
    if (offer.progressType === 'consecutive_days') return (progressDoc && progressDoc.consecutiveDays) || 0;
    if (offer.progressType === 'rides_in_time_window') return (progressDoc && progressDoc.currentCount) || 0;
    return 0;
}

// Ek offer ka reward user ko dena. Credit hua to result object, nahi to null.
async function claimProgressReward(userId, offer) {
    const reward = Number(offer.rewardValue || offer.discountValue || 0);

    // Abhi sirf wallet credit rewards auto apply hote hain
    if (offer.rewardType && offer.rewardType !== 'wallet_credit') return null;
    if (!(reward > 0)) return null;

    // 1) totalUsageLimit (agar laga ho) me se ek slot reserve karo
    const reserved = await Offer.findOneAndUpdate(
        {
            _id: offer._id,
            $or: [
                { totalUsageLimit: { $exists: false } },
                { totalUsageLimit: { $lte: 0 } },
                { $expr: { $lt: ['$totalUsedCount', '$totalUsageLimit'] } },
            ],
        },
        { $inc: { totalUsedCount: 1 } }
    );
    if (!reserved) return null; // offer fully redeemed

    const releaseSlot = () => Offer.updateOne({ _id: offer._id }, { $inc: { totalUsedCount: -1 } });

    // 2) Atomic claim — sirf ek hi call is user+offer ko claim kar sakta hai
    let progress;
    try {
        progress = await UserOfferProgress.findOneAndUpdate(
            { userId, offerId: offer._id, rewardClaimed: { $ne: true } },
            { $set: { isCompleted: true, completedAt: new Date(), rewardClaimed: true } },
            { upsert: true, new: true }
        );
    } catch (e) {
        await releaseSlot();
        if (e && e.code === 11000) return null; // already claimed
        throw e;
    }
    if (!progress) {
        await releaseSlot();
        return null;
    }

    // 3) Wallet credit (paise me)
    let wallet;
    try {
        wallet = await Wallet.create({
            userId,
            type: 'add',
            amount: Math.round(reward * 100),
            status: 'completed',
            description: `Reward: ${offer.title}`,
        });
    } catch (e) {
        await UserOfferProgress.updateOne({ _id: progress._id }, { $set: { rewardClaimed: false } });
        await releaseSlot();
        throw e;
    }

    // 4) Reward History me entry (paisa credit ho chuka hai, isliye yahan fail ho to rollback nahi)
    try {
        await OfferRedemption.create({
            userId,
            offerId: offer._id,
            referenceType: 'reward',
            referenceId: progress._id,
            discountAmount: reward,
        });
    } catch (e) {
        console.error('❌ Reward history entry failed (wallet already credited):', e.message);
    }

    return { offerId: offer._id, title: offer.title, reward, walletId: wallet._id };
}

// Is user ke saare earn ho chuke progress rewards auto apply karo
async function autoApplyProgressRewards(userId) {
    const now = new Date();

    const offers = await Offer.find({
        offerType: 'progress',
        isActive: true,
        isDeleted: false,
        validFrom: { $lte: now },
        validTo: { $gte: now },
    }).lean();

    if (!offers.length) return [];

    const docs = await UserOfferProgress.find({
        userId,
        offerId: { $in: offers.map((o) => o._id) },
    }).lean();

    const docMap = {};
    docs.forEach((d) => {
        docMap[String(d.offerId)] = d;
    });

    const applied = [];

    for (const offer of offers) {
        const doc = docMap[String(offer._id)];
        if (doc && doc.rewardClaimed) continue;

        const target = Number(offer.targetCount) || 0;
        if (target <= 0) continue;

        const current = await getCurrentProgress(userId, offer, doc);
        if (current < target) continue;

        try {
            const result = await claimProgressReward(userId, offer);
            if (result) applied.push(result);
        } catch (e) {
            console.error(`❌ Auto apply failed for offer ${offer._id}:`, e.message);
        }
    }

    return applied;
}

module.exports = { autoApplyProgressRewards, claimProgressReward, getRideCountInPeriod };