const User = require('../models/userModel');
const Wallet = require('../models/wallet');
const Charges = require('../models/chargesModel');

// Description prefix — refer-earn API isi se total earnings nikalti hai
const REFERRAL_DESC_PREFIX = 'Referral bonus';

// Referral code se aaye user (referee) ki PEHLI qualifying ride complete hone par
// SIRF referrer (purana user, jisne code diya) ko Charges.referralEarnValue wallet me milta hai.
// Naya user (referee) ko kuch nahi milta.
// Qualifying = ride fare >= Charges.referralMinFare. Sirf ek baar (referralRewarded flag).
// Driver ke completeRide me call hota hai..
async function applyReferralReward(userId, ride) {
    const log = msg => console.log(`ℹ️ [Referral] ${msg}`);

    // 1) Kya ye user kisi referral se aaya hai aur reward abhi baaki hai?
    const user = await User.findById(userId).select('referredBy referralCode referralRewarded');
    if (!user) return log('user not found'), null;
    if (user.referralRewarded) return log('bonus already given'), null;

    // Purane signups (jab referredBy save nahi hota tha) ke liye: daale gaye code se referrer dhoondo
    let referrerId = user.referredBy;
    if (!referrerId && user.referralCode) {
        const referrer = await User.findOne({ myReferralCode: String(user.referralCode).trim().toUpperCase() }).select('_id');
        if (referrer) {
            referrerId = referrer._id;
            await User.updateOne({ _id: userId }, { $set: { referredBy: referrer._id } }); // future ke liye save
        }
    }
    if (!referrerId) return log('user did not join using a referral code'), null;
    if (String(referrerId) === String(userId)) return log('self referral ignored'), null;

    // 2) Charges config
    const charges = await Charges.findOne();
    const earnValue = Number(charges?.referralEarnValue) || 0;
    const minFare = Number(charges?.referralMinFare) || 0;
    if (earnValue <= 0) return log('Charges.referralEarnValue is 0 — admin Charges page me set karo'), null;

    // 3) Fare minimum se kam hai to abhi reward nahi (agli ride par dobara check hoga)
    const fare = Number(ride?.price) || Number(ride?.estimatedTotal) || 0;
    if (fare < minFare) return log(`ride fare ${fare} < minimum fare ${minFare} — agli ride par check hoga`), null;

    // 3.5) DUPLICATE GUARD (flag se independent): is referee ke liye referrer ko bonus pehle hi mil chuka?
    // Wallet me hi check karte hain, isliye userModel me referralRewarded field na ho tab bhi double credit nahi hoga.
    const bonusDescription = `${REFERRAL_DESC_PREFIX} - friend completed first ride (user:${userId})`;
    const alreadyCredited = await Wallet.exists({ userId: referrerId, type: 'add', description: bonusDescription });
    if (alreadyCredited) {
        await User.updateOne({ _id: userId }, { $set: { referralRewarded: true } }, { strict: false });
        return log('bonus already credited for this user — skipping'), null;
    }

    // 4) Atomic claim — double credit na ho
    const claimed = await User.findOneAndUpdate(
        { _id: userId, referralRewarded: { $ne: true } },
        { $set: { referralRewarded: true } },
        { new: true, strict: false }
    );
    if (!claimed) return null;

    const amount = Math.round(earnValue * 100); // wallet me cents

    // 5) SIRF purane user (referrer — jisne code diya) ko credit. Naye user ko kuch nahi milta.
    const referrerExists = await User.exists({ _id: referrerId });
    if (!referrerExists) return log('referrer account not found — no bonus'), null;

    try {
        await Wallet.create({
            userId: referrerId,
            type: 'add',
            amount,
            status: 'completed',
            rideId: ride?._id,
            description: bonusDescription,
        });
    } catch (e) {
        // credit fail hua to claim wapas, taaki agli ride par dobara try ho
        await User.updateOne({ _id: userId }, { $set: { referralRewarded: false } }, { strict: false });
        throw e;
    }

    return { amount: earnValue, referrerId };
}

module.exports = { applyReferralReward, REFERRAL_DESC_PREFIX };