const FareConfig = require('../../models/fareConfigModel');
const { getActiveFareConfig, calculateFare } = require('../../utils/fareEngine');

// GET - Fare Settings Page
exports.getFareSettings = async (req, res) => {
    try {
        const fareConfig = await getActiveFareConfig(FareConfig);

        // Live preview rows so admin can sanity-check the formula while editing
        const previewDistancesKm = [5, 15, 40];
        const preview = previewDistancesKm.map((distanceKm) =>
            calculateFare({ distanceKm, fareConfig: fareConfig.toObject ? fareConfig.toObject() : fareConfig })
        );

        res.render('fareSettings', {
            title: 'Fare Settings',
            fareConfig,
            preview,
        });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin');
    }
};

// POST - Save Fare Settings
exports.postFareSettings = async (req, res) => {
    try {
        const {
            shortMaxDistanceKm,
            mediumMaxDistanceKm,
            baseFareShort,
            baseFareMedium,
            baseFareLong,
            tierUpToMiles,
            tierRatePerMile,
            feeName,
            feeAmount,
            feeEnabled,
        } = req.body;

        const shortMax = parseFloat(shortMaxDistanceKm);
        const mediumMax = parseFloat(mediumMaxDistanceKm);

        if (isNaN(shortMax) || shortMax <= 0) {
            req.flash('red', 'Short trip distance threshold must be a positive number.');
            return res.redirect('/admin/fare-settings');
        }
        if (isNaN(mediumMax) || mediumMax <= shortMax) {
            req.flash('red', 'Medium trip threshold must be greater than the short trip threshold.');
            return res.redirect('/admin/fare-settings');
        }

        const baseShort = parseFloat(baseFareShort);
        const baseMedium = parseFloat(baseFareMedium);
        const baseLong = parseFloat(baseFareLong);
        if ([baseShort, baseMedium, baseLong].some((v) => isNaN(v) || v < 0)) {
            req.flash('red', 'Base fare values must be positive numbers.');
            return res.redirect('/admin/fare-settings');
        }

        // Rebuild per-mile tiers from parallel arrays (form fields repeat by name)
        const upToMilesArr = [].concat(tierUpToMiles || []);
        const ratePerMileArr = [].concat(tierRatePerMile || []);
        const perMileRateTiers = upToMilesArr
            .map((upTo, idx) => ({
                upToMiles: parseFloat(upTo) || 0,
                ratePerMile: parseFloat(ratePerMileArr[idx]) || 0,
            }))
            .filter((t) => t.ratePerMile >= 0);

        if (perMileRateTiers.length === 0) {
            req.flash('red', 'At least one per-mile rate tier is required.');
            return res.redirect('/admin/fare-settings');
        }

        // Rebuild fees from parallel arrays. Checkbox values for "enabled"
        // only appear when checked, so match them back up by fee name.
        const feeNameArr = [].concat(feeName || []);
        const feeAmountArr = [].concat(feeAmount || []);
        const enabledSet = new Set([].concat(feeEnabled || []));
        const fees = feeNameArr
            .map((name, idx) => ({
                name: (name || '').trim(),
                amount: parseFloat(feeAmountArr[idx]) || 0,
                enabled: enabledSet.has(String(idx)),
            }))
            .filter((f) => f.name);

        if (fees.length === 0) {
            req.flash('red', 'At least one fee rule is required.');
            return res.redirect('/admin/fare-settings');
        }

        await FareConfig.findOneAndUpdate(
            { isActive: true },
            {
                $set: {
                    tripTypeThresholds: {
                        shortMaxDistanceKm: shortMax,
                        mediumMaxDistanceKm: mediumMax,
                    },
                    baseFare: { short: baseShort, medium: baseMedium, long: baseLong },
                    perMileRateTiers,
                    fees,
                    isActive: true,
                    updatedBy: req.admin?._id || req.admin?.id,
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        req.flash('green', 'Fare settings updated successfully. Changes apply instantly — no app update required.');
        res.redirect('/admin/fare-settings');
    } catch (error) {
        console.error('[FareSettings] Save error:', error);
        req.flash('red', error.message);
        res.redirect('/admin/fare-settings');
    }
};
