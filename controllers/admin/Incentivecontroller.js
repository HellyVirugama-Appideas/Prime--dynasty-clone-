const Incentive = require('../../models/Incentivemodel');
const Reward = require('../../models/Driverincentiverewardmodel');
const svc = require('../../utils/Incentiveservice');

const PERIODS = ['daily', 'weekly', 'bonus'];
const METRICS = ['rides', 'distance', 'days'];

const toArray = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);

// Form body -> clean object (tiers: tierTarget[] + tierReward[])
const parseForm = (body) => {
    const targets = toArray(body.tierTarget);
    const rewards = toArray(body.tierReward);
    const tiers = [];

    for (let i = 0; i < Math.max(targets.length, rewards.length); i++) {
        const t = String(targets[i] ?? '').trim();
        const r = String(rewards[i] ?? '').trim();
        if (t === '' && r === '') continue; // khaali row
        tiers.push({ target: Number(t), reward: Number(r === '' ? NaN : r) });
    }

    return {
        title: (body.title || '').trim(),
        description: (body.description || '').trim(),
        bonusName: (body.bonusName || '').trim(),
        period: body.period,
        metric: body.metric,
        distanceUnit: body.distanceUnit === 'mi' ? 'mi' : 'km',
        minRidesPerDay: Number(body.minRidesPerDay) || 1,
        timeWindowStart: (body.timeWindowStart || '').trim(),
        timeWindowEnd: (body.timeWindowEnd || '').trim(),
        daysOfWeek: toArray(body.daysOfWeek).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
        validFrom: (body.validFrom || '').trim(),
        validTo: (body.validTo || '').trim(),
        sortOrder: Number(body.sortOrder) || 0,
        isActive: body.isActive === 'on' || body.isActive === 'true',
        tiers,
    };
};

// Validation: error message ya null
const validate = (d) => {
    if (!PERIODS.includes(d.period)) return 'Please select a valid period (Daily / Weekly / Bonus).';
    if (!METRICS.includes(d.metric)) return 'Please select what to count (Rides / Distance / Days).';
    if (d.metric === 'days' && d.period !== 'weekly') return '"Days" metric is only allowed for Weekly incentives.';

    if (!svc.isValidYmd(d.validFrom) || !svc.isValidYmd(d.validTo)) return 'Valid From and Valid To dates are required.';
    if (d.validFrom > d.validTo) return 'Valid From must be before Valid To.';

    const hasS = !!d.timeWindowStart, hasE = !!d.timeWindowEnd;
    if (hasS !== hasE) return 'Please fill both Time Window start and end (or leave both empty).';
    if (hasS && (svc.hhmmToMin(d.timeWindowStart) === null || svc.hhmmToMin(d.timeWindowEnd) === null))
        return 'Time Window must be in HH:mm format.';

    if (!d.tiers.length) return 'Add at least one milestone.';
    const seen = new Set();
    for (const t of d.tiers) {
        if (!Number.isFinite(t.target) || t.target <= 0) return 'Every milestone needs a target greater than 0.';
        if (!Number.isFinite(t.reward) || t.reward < 0) return 'Every milestone needs a valid reward amount.';
        if (seen.has(t.target)) return `Duplicate milestone target: ${t.target}.`;
        seen.add(t.target);
    }
    if (d.metric === 'days' && d.tiers.some((t) => t.target > 7)) return 'Weekly "Days" target cannot be more than 7.';

    return null;
};

// parseForm -> DB document
const toDoc = (d) => ({
    title: d.title,
    description: d.description,
    bonusName: d.bonusName,
    period: d.period,
    metric: d.metric,
    distanceUnit: d.distanceUnit,
    minRidesPerDay: d.metric === 'days' ? d.minRidesPerDay : 1,
    timeWindowStart: d.timeWindowStart || undefined,
    timeWindowEnd: d.timeWindowEnd || undefined,
    daysOfWeek: d.period === 'daily' ? d.daysOfWeek : [],
    validFrom: svc.dayStartOf(d.validFrom),
    validTo: svc.dayEndOf(d.validTo),
    sortOrder: d.sortOrder,
    isActive: d.isActive,
    tiers: d.tiers.sort((a, b) => a.target - b.target),
});

// DB document -> form values (edit page)
const toFormData = (inc) => ({
    title: inc.title || '',
    description: inc.description || '',
    bonusName: inc.bonusName || '',
    period: inc.period,
    metric: inc.metric,
    distanceUnit: inc.distanceUnit || 'km',
    minRidesPerDay: inc.minRidesPerDay || 1,
    timeWindowStart: inc.timeWindowStart || '',
    timeWindowEnd: inc.timeWindowEnd || '',
    daysOfWeek: inc.daysOfWeek || [],
    validFrom: svc.toYmd(inc.validFrom),
    validTo: svc.toYmd(inc.validTo),
    sortOrder: inc.sortOrder || 0,
    isActive: inc.isActive,
    tiers: (inc.tiers || []).map((t) => ({ target: t.target, reward: t.reward })),
});

const renderForm = (res, opts) =>
    res.render('incentive_form', {
        title: opts.isEdit ? 'Edit Incentive' : 'Add Incentive',
        isEdit: !!opts.isEdit,
        incentiveId: opts.id || '',
        formData: opts.formData || {},
    });

// ---------------------------------------------------------------------
// GET /admin/incentives?period=all|daily|weekly|bonus&status=all|active|inactive|expired
// ---------------------------------------------------------------------
exports.listIncentives = async (req, res) => {
    try {
        const period = PERIODS.includes(req.query.period) ? req.query.period : 'all';
        const status = ['active', 'inactive', 'expired'].includes(req.query.status) ? req.query.status : 'all';
        const now = new Date();

        const all = await Incentive.find({ isDeleted: false }).sort('period sortOrder -createdAt').lean();

        const isExpired = (i) => now > new Date(i.validTo);
        const isLive = (i) => i.isActive && now >= new Date(i.validFrom) && now <= new Date(i.validTo);

        const counts = {
            total: all.length,
            active: all.filter(isLive).length,
            inactive: all.filter((i) => !i.isActive).length,
            expired: all.filter(isExpired).length,
        };

        let list = all;
        if (period !== 'all') list = list.filter((i) => i.period === period);
        if (status === 'active') list = list.filter(isLive);
        else if (status === 'inactive') list = list.filter((i) => !i.isActive);
        else if (status === 'expired') list = list.filter(isExpired);

        const incentives = list.map((i) => ({
            ...i,
            displayTitle: svc.displayTitle(i),
            displaySubtitle: svc.displaySubtitle(i),
            unitWord: svc.unitWord(i),
            tiers: svc.sortedTiers(i),
            windowText:
                i.timeWindowStart && i.timeWindowEnd
                    ? `${svc.fmt12(i.timeWindowStart)} - ${svc.fmt12(i.timeWindowEnd)}`
                    : '',
            fromText: svc.toYmd(i.validFrom),
            toText: svc.toYmd(i.validTo),
            state: !i.isActive
                ? 'inactive'
                : now < new Date(i.validFrom)
                    ? 'upcoming'
                    : isExpired(i)
                        ? 'expired'
                        : 'active',
        }));

        res.render('incentives', {
            title: 'Incentives & Bonus',
            incentives,
            counts,
            period,
            status,
            currency: svc.CURRENCY,
        });
    } catch (error) {
        console.error('listIncentives Error:', error);
        req.flash('red', error.message);
        res.redirect('/admin');
    }
};

// GET /admin/incentives/add
exports.addIncentiveForm = (req, res) => {
    renderForm(res, {
        formData: {
            period: req.query.period || 'daily',
            metric: 'rides',
            distanceUnit: 'km',
            minRidesPerDay: 1,
            daysOfWeek: [],
            isActive: true,
            sortOrder: 0,
            tiers: [{ target: '', reward: '' }],
        },
    });
};

// POST /admin/incentives/add
exports.createIncentive = async (req, res) => {
    const data = parseForm(req.body);
    try {
        const error = validate(data);
        if (error) {
            req.flash('red', error);
            return renderForm(res, { formData: { ...data, tiers: data.tiers.length ? data.tiers : [{ target: '', reward: '' }] } });
        }

        await Incentive.create(toDoc(data));

        req.flash('green', 'Incentive added successfully.');
        res.redirect(`/admin/incentives?period=${data.period}`);
    } catch (error) {
        console.error('createIncentive Error:', error);
        req.flash('red', error.message);
        renderForm(res, { formData: data });
    }
};

// GET /admin/incentives/edit/:id
exports.editIncentiveForm = async (req, res) => {
    try {
        const inc = await Incentive.findOne({ _id: req.params.id, isDeleted: false }).lean();
        if (!inc) {
            req.flash('red', 'Incentive not found.');
            return res.redirect('/admin/incentives');
        }
        renderForm(res, { isEdit: true, id: inc._id, formData: toFormData(inc) });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/incentives');
    }
};

// POST /admin/incentives/edit/:id
exports.updateIncentive = async (req, res) => {
    const data = parseForm(req.body);
    try {
        const error = validate(data);
        if (error) {
            req.flash('red', error);
            return renderForm(res, { isEdit: true, id: req.params.id, formData: data });
        }

        const inc = await Incentive.findOne({ _id: req.params.id, isDeleted: false });
        if (!inc) {
            req.flash('red', 'Incentive not found.');
            return res.redirect('/admin/incentives');
        }

        inc.set(toDoc(data));
        await inc.save();

        req.flash('green', 'Incentive updated successfully.');
        res.redirect(`/admin/incentives?period=${data.period}`);
    } catch (error) {
        console.error('updateIncentive Error:', error);
        req.flash('red', error.message);
        renderForm(res, { isEdit: true, id: req.params.id, formData: data });
    }
};

// POST /admin/incentives/toggle/:id
exports.toggleIncentive = async (req, res) => {
    try {
        const inc = await Incentive.findOne({ _id: req.params.id, isDeleted: false });
        if (inc) {
            inc.isActive = !inc.isActive;
            await inc.save();
            req.flash('green', `Incentive ${inc.isActive ? 'activated' : 'deactivated'}.`);
        }
    } catch (error) {
        req.flash('red', error.message);
    }
    res.redirect('back');
};

// POST /admin/incentives/delete/:id  (soft delete — mile hue rewards/history safe rehte hain)
exports.deleteIncentive = async (req, res) => {
    try {
        await Incentive.findByIdAndUpdate(req.params.id, { isDeleted: true, isActive: false });
        req.flash('green', 'Incentive deleted.');
    } catch (error) {
        req.flash('red', error.message);
    }
    res.redirect('back');
};

// GET /admin/incentives/rewards?period=all|daily|weekly|bonus   (kis driver ko kitna incentive mila)
exports.rewardsReport = async (req, res) => {
    try {
        const period = PERIODS.includes(req.query.period) ? req.query.period : 'all';
        const filter = period === 'all' ? {} : { period };

        const [rewards, totalAgg] = await Promise.all([
            Reward.find(filter)
                .sort({ createdAt: -1 })
                .limit(500)
                .populate('driver', 'name phone')
                .populate('incentive', 'title bonusName')
                .lean(),
            Reward.aggregate([
                ...(period === 'all' ? [] : [{ $match: { period } }]),
                { $group: { _id: null, total: { $sum: '$reward' }, count: { $sum: 1 } } },
            ]),
        ]);

        res.render('incentive_rewards', {
            title: 'Incentive Rewards',
            rewards,
            period,
            totalPaid: (totalAgg[0] && totalAgg[0].total) || 0,
            totalCount: (totalAgg[0] && totalAgg[0].count) || 0,
            currency: svc.CURRENCY,
        });
    } catch (error) {
        console.error('rewardsReport Error:', error);
        req.flash('red', error.message);
        res.redirect('/admin/incentives');
    }
};