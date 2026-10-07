const Offer = require('../models/offerModel');
const OfferRedemption = require('../models/offerRedemptionModel');

/**
 * Validates coupon and returns discount details.
 * Returns { discount: 0, couponApplied: null } if no code given or invalid (does NOT throw).
 * Throws only if code was given but is invalid/expired — so caller can decide to block or ignore.
 */
async function applyOfferDiscount({ couponCode, amount, type, userId }) {
    if (!couponCode) return { discount: 0, couponApplied: null, offerId: null };

    const offer = await Offer.findOne({
        code: couponCode.toUpperCase().trim(),
        isDeleted: false,
    });

    if (!offer) throw new Error('Invalid coupon code.');

    const now = new Date();
    if (!offer.isActive) throw new Error('This offer is not active.');
    if (now < offer.validFrom || now > offer.validTo) throw new Error('This offer has expired.');
    if (offer.applicableOn !== 'all' && offer.applicableOn !== type)
        throw new Error(`This offer is not applicable on ${type}.`);
    if (amount < offer.minOrderAmount)
        throw new Error(`Minimum amount for this offer is ${offer.minOrderAmount}.`);
    if (offer.totalUsageLimit > 0 && offer.totalUsedCount >= offer.totalUsageLimit)
        throw new Error('This offer has been fully redeemed.');

    if (offer.usageLimitPerUser > 0) {
        const usedByUser = await OfferRedemption.countDocuments({ userId, offerId: offer._id });
        if (usedByUser >= offer.usageLimitPerUser)
            throw new Error('You have already used this offer.');
    }

    let discount = offer.discountType === 'flat'
        ? offer.discountValue
        : (amount * offer.discountValue) / 100;

    if (offer.discountType === 'percentage' && offer.maxDiscount > 0)
        discount = Math.min(discount, offer.maxDiscount);

    discount = Number(Math.min(discount, amount).toFixed(2));

    return { discount, couponApplied: offer.code, offerId: offer._id };
}

/**
 * Records offer usage after a successful payment — call this ONLY after payment/booking succeeds.
 */
async function recordOfferRedemption({ userId, offerId, referenceType, referenceId, discountAmount }) {
    if (!offerId) return;
    await OfferRedemption.create({ userId, offerId, referenceType, referenceId, discountAmount });
    await Offer.findByIdAndUpdate(offerId, { $inc: { totalUsedCount: 1 } });
}

module.exports = { applyOfferDiscount, recordOfferRedemption };