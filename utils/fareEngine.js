const KM_TO_MILES = 0.621371;

/**
 * Section 3 — Trip Type Classification
 * Trips are automatically categorized by the system based on distance.
 * Thresholds are configurable from the Admin Panel.
 */
function classifyTripType(distanceKm, thresholds = {}) {
    const shortMax = Number(thresholds.shortMaxDistanceKm) || 8;
    const mediumMax = Number(thresholds.mediumMaxDistanceKm) || 24;

    if (distanceKm <= shortMax) return 'Short';
    if (distanceKm <= mediumMax) return 'Medium';
    return 'Long';
}

/**
 * Section 4.3 — Distance-Based Rides
 *
 * DYNAMIC / PROGRESSIVE tiering (like tax slabs): every mile is charged at
 * the rate of the band it actually falls into, and the charges from each
 * band are added up. This means the fare scales smoothly with distance —
 * there is no sudden "jump" the moment a trip crosses a tier boundary.
 *
 * Example tiers: 0–10mi @ $2.50, 10–20mi @ $2.75, 20+ (catch-all, upToMiles=0) @ $2.80
 * A 15 mile trip = (10 x $2.50) + (5 x $2.75) = $38.75  ← NOT 15 x $2.75 flat.
 */
function calculateProgressiveDistanceCharge(distanceMiles, tiers = []) {
    if (!Array.isArray(tiers) || tiers.length === 0 || distanceMiles <= 0) {
        return { distanceCharge: 0, breakdown: [], effectiveRatePerMile: 0 };
    }

    // Normalize + sort tiers ascending. A tier with upToMiles <= 0 is the
    // final "and above" catch-all band and always sorts last.
    const sorted = [...tiers]
        .map((t) => ({
            upToMiles: !t.upToMiles || t.upToMiles <= 0 ? Infinity : Number(t.upToMiles),
            ratePerMile: Number(t.ratePerMile) || 0,
        }))
        .sort((a, b) => a.upToMiles - b.upToMiles);

    let remainingMiles = distanceMiles;
    let lowerBound = 0;
    let distanceCharge = 0;
    const breakdown = [];

    for (const tier of sorted) {
        if (remainingMiles <= 0) break;

        const bandWidth = tier.upToMiles - lowerBound; // how wide this band is
        const milesInBand = Math.min(remainingMiles, bandWidth);

        if (milesInBand > 0) {
            const bandCharge = Number((milesInBand * tier.ratePerMile).toFixed(2));
            distanceCharge += bandCharge;
            breakdown.push({
                fromMile: Number(lowerBound.toFixed(2)),
                toMile: Number((lowerBound + milesInBand).toFixed(2)),
                miles: Number(milesInBand.toFixed(2)),
                ratePerMile: tier.ratePerMile,
                charge: bandCharge,
            });
            remainingMiles -= milesInBand;
        }
        lowerBound = tier.upToMiles;
    }

    distanceCharge = Number(distanceCharge.toFixed(2));
    const effectiveRatePerMile = distanceMiles > 0 ? Number((distanceCharge / distanceMiles).toFixed(4)) : 0;

    return { distanceCharge, breakdown, effectiveRatePerMile };
}

// Kept for backward compatibility / anywhere a single "which tier am I in"
// lookup is still needed (e.g. showing "$2.75/mi after 10mi" in the UI).
function getPerMileRate(distanceMiles, tiers = []) {
    if (!Array.isArray(tiers) || tiers.length === 0) return 0;

    const sorted = [...tiers].sort((a, b) => {
        const aVal = a.upToMiles > 0 ? a.upToMiles : Infinity;
        const bVal = b.upToMiles > 0 ? b.upToMiles : Infinity;
        return aVal - bVal;
    });

    for (const tier of sorted) {
        if (!tier.upToMiles || tier.upToMiles <= 0) return tier.ratePerMile; // catch-all / final tier
        if (distanceMiles <= tier.upToMiles) return tier.ratePerMile;
    }
    return sorted[sorted.length - 1].ratePerMile;
}

/**
 * Section 5 — Fare Calculation Logic
 * Total Fare = Base Fare + (Progressive Per-Mile Charge) + Fees
 * Short trips do not include distance-based pricing.
 * Performed on the backend only, so User / Driver / Admin always see the
 * exact same number (Section 10 — Non-Functional Requirements).
 */
function calculateFare({ distanceKm, fareConfig }) {
    distanceKm = Number(distanceKm) || 0;
    const distanceMiles = Number((distanceKm * KM_TO_MILES).toFixed(4));

    const tripType = classifyTripType(distanceKm, fareConfig.tripTypeThresholds);
    const tripTypeKey = tripType.toLowerCase(); // short | medium | long

    const baseFare = Number(fareConfig.baseFare?.[tripTypeKey]) || 0;

    let distanceCharge = 0;
    let distanceChargeBreakdown = [];
    let effectiveRatePerMile = 0;
    if (tripType !== 'Short') {
        const result = calculateProgressiveDistanceCharge(distanceMiles, fareConfig.perMileRateTiers);
        distanceCharge = result.distanceCharge;
        distanceChargeBreakdown = result.breakdown;
        effectiveRatePerMile = result.effectiveRatePerMile;
    }

    const enabledFees = (fareConfig.fees || []).filter((f) => f.enabled);
    const platformFee = Number(
        enabledFees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0).toFixed(2)
    );

    // Surge is out of scope for Phase 1 (kept at 0, reserved for Phase 2).
    const surgeCharge = 0;

    const estimatedTotal = Number((baseFare + distanceCharge + platformFee + surgeCharge).toFixed(2));

    return {
        tripType,
        distanceKm: Number(distanceKm.toFixed(2)),
        distanceMiles: Number(distanceMiles.toFixed(2)),
        baseFare,
        perMileRate: effectiveRatePerMile, // average $/mile actually charged (dynamic, not a single flat tier rate)
        distanceCharge,
        distanceChargeBreakdown, // per-band detail: which miles were charged at which rate
        fees: enabledFees.map((f) => ({ name: f.name, amount: f.amount })),
        platformFee,
        surgeCharge,
        estimatedTotal,
        totalFare: estimatedTotal,
    };
}

/**
 * Fetches the single active fare configuration, creating one with schema
 * defaults the very first time the platform is used (so admin always has
 * something to edit and the app never breaks on a fresh install).
 */
async function getActiveFareConfig(FareConfig) {
    let config = await FareConfig.findOne({ isActive: true }).sort({ updatedAt: -1 });
    if (!config) {
        config = await FareConfig.create({});
    }
    return config;
}

module.exports = {
    KM_TO_MILES,
    classifyTripType,
    getPerMileRate,
    calculateProgressiveDistanceCharge,
    calculateFare,
    getActiveFareConfig,
};
