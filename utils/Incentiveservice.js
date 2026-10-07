// =====================================================================
// Driver Incentives & Bonus — core logic
//
//   getDailyView   -> Daily tab   (date strip + us din ke incentive cards)
//   getWeeklyView  -> Weekly tab  (week strip + week ke incentive cards / Day 1..7)
//   getBonusView   -> Bonus tab   (bonus cards + Bonus history)
//   processRideCompletion -> ride complete hone par milestone reach hua to wallet me reward credit
//
// Progress DB me counter ki tarah save nahi hota, har baar Ride collection se
// calculate hota hai (isliye hamesha sahi rehta hai). Sirf mila hua reward
// DriverIncentiveReward me save hota hai (history + double credit se bachav).
//
// Env (optional):
//   INCENTIVE_TZ_OFFSET = minutes (India = 330, default). Din 12am se isi timezone me shuru hota hai.
//   INCENTIVE_CURRENCY  = currency symbol (default ₹)
// =====================================================================

const mongoose = require('mongoose');
const Ride = require('../models/rideModel');
const Wallet = require('../models/wallet');
const Incentive = require('../models/Incentivemodel');
const Reward = require('../models/Driverincentiverewardmodel');

const envTz = process.env.INCENTIVE_TZ_OFFSET;
const TZ = envTz !== undefined && envTz !== '' && Number.isFinite(Number(envTz)) ? Number(envTz) : 330;
const CURRENCY = process.env.INCENTIVE_CURRENCY || '₹';
const WEEK_START = 0; // 0 = Sunday (design: "Sun, 15 Feb To Sat, 21 Feb")
const KM_PER_MI = 1.609344;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------------------------------------------------------------------
// Date helpers (sab kuch INCENTIVE_TZ_OFFSET wale local din ke hisaab se)
// ---------------------------------------------------------------------
const pad = (n) => String(n).padStart(2, '0');

const isValidYmd = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return false;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
};

const ymdToMs = (ymd) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
};
const msToYmd = (ms) => {
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
const addDays = (ymd, n) => msToYmd(ymdToMs(ymd) + n * 86400000);
const weekdayOf = (ymd) => new Date(ymdToMs(ymd)).getUTCDay();
const weekStartOf = (ymd) => addDays(ymd, -((weekdayOf(ymd) - WEEK_START + 7) % 7));

const dayStartOf = (ymd) => new Date(ymdToMs(ymd) - TZ * 60000);
const dayEndOf = (ymd) => new Date(ymdToMs(ymd) - TZ * 60000 + 86400000 - 1);
const toYmd = (date) => msToYmd(new Date(date).getTime() + TZ * 60000);
const todayYmd = () => toYmd(new Date());
const minutesOfDay = (date) => {
    const x = new Date(new Date(date).getTime() + TZ * 60000);
    return x.getUTCHours() * 60 + x.getUTCMinutes();
};

const shortDate = (ymd) => `${Number(ymd.slice(8))} ${MONTHS[Number(ymd.slice(5, 7)) - 1]}`;
const longDate = (ymd) => `${shortDate(ymd)} ${ymd.slice(0, 4)}`;
const dayName = (ymd) => DAYS[weekdayOf(ymd)];

// ---------------------------------------------------------------------
// Text / number helpers
// ---------------------------------------------------------------------
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const money = (n) => round2(n).toFixed(2).replace(/\.00$/, '');

// "6.4 km" / "3 mi" / "850 m" / "6.4" -> km
const parseDistanceKm = (value) => {
    if (value === undefined || value === null) return 0;
    const str = String(value).toLowerCase().replace(/,/g, '');
    const num = parseFloat(str);
    if (!Number.isFinite(num)) return 0;
    if (/\b(mi|mile|miles)\b/.test(str)) return num * KM_PER_MI;
    if (/\d\s*m(?!i)\b/.test(str) && !/km/.test(str)) return num / 1000;
    return num;
};

// "06:00" -> minutes, galat format -> null
const hhmmToMin = (s) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
    if (!m) return null;
    const h = +m[1], mi = +m[2];
    return h > 23 || mi > 59 ? null : h * 60 + mi;
};
// "17:00" -> "05:00 PM"
const fmt12 = (s) => {
    const min = hhmmToMin(s);
    if (min === null) return s;
    const h = Math.floor(min / 60), m = min % 60;
    return `${pad(h % 12 === 0 ? 12 : h % 12)}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
};

const unitWord = (inc) =>
    inc.metric === 'rides' ? 'Rides' : inc.metric === 'days' ? 'Days' : inc.distanceUnit === 'mi' ? 'Miles' : 'Km';

// 1 ho to singular: "Complete 1 Ride", "1 more mile left"
const unitWordN = (inc, n) => {
    const w = unitWord(inc);
    if (Number(n) !== 1) return w;
    return w === 'Rides' ? 'Ride' : w === 'Days' ? 'Day' : w === 'Miles' ? 'Mile' : w;
};

const periodPhrase = (inc) =>
    inc.period === 'daily' ? ' in a day' : inc.period === 'weekly' ? ' in a week' : '';

const sortedTiers = (inc) => [...(inc.tiers || [])].sort((a, b) => a.target - b.target);
const maxRewardOf = (inc) => round2(sortedTiers(inc).reduce((s, t) => s + (Number(t.reward) || 0), 0));

// "Earn up to ₹15"
const displayTitle = (inc) => inc.title || `Earn up to ${CURRENCY}${money(maxRewardOf(inc))}`;

// "by completing 20 rides in a day"
const displaySubtitle = (inc) => {
    if (inc.description) return inc.description;
    const tiers = sortedTiers(inc);
    const top = tiers.length ? tiers[tiers.length - 1].target : 0;
    if (inc.metric === 'days')
        return `by completing ${inc.minRidesPerDay || 1} ride${(inc.minRidesPerDay || 1) > 1 ? 's' : ''}/day for ${top} days`;
    return `by completing ${top} ${unitWord(inc).toLowerCase()}${periodPhrase(inc)}`;
};

const bonusNameOf = (inc) =>
    inc.bonusName ||
    (inc.period === 'daily' ? 'Daily Bonus' : inc.period === 'weekly' ? 'Weekly Bonus' : 'Bonus');

// ---------------------------------------------------------------------
// Rides + progress
// ---------------------------------------------------------------------
const hasCompletedAtField = () => {
    try {
        return !!(Ride.schema && Ride.schema.path('completedAt'));
    } catch (e) {
        return false;
    }
};

// [start, end] me complete hui rides: { at: completion time, km }
const loadRides = async (driverId, start, end) => {
    const base = { driver: driverId, status: 'Completed' };

    // completedAt schema me ho tabhi query me use karo (warna mongoose use filter se hata deta hai)
    const filter = hasCompletedAtField()
        ? {
            ...base,
            $or: [
                { completedAt: { $gte: start, $lte: end } },
                { completedAt: null, createdAt: { $gte: start, $lte: end } },
            ],
        }
        : { ...base, createdAt: { $gte: start, $lte: end } };

    const rides = await Ride.find(filter).select('distance completedAt createdAt').lean();

    return rides.map((r) => ({
        at: new Date(r.completedAt || r.createdAt),
        km: parseDistanceKm(r.distance),
    }));
};

const inWindow = (date, inc) => {
    const s = hhmmToMin(inc.timeWindowStart);
    const e = hhmmToMin(inc.timeWindowEnd);
    if (s === null || e === null) return true;
    const m = minutesOfDay(date);
    return s <= e ? m >= s && m <= e : m >= s || m <= e; // overnight window bhi chalega
};

const computeProgress = (inc, rides) => {
    const inRange = rides.filter((r) => inWindow(r.at, inc));
    let current = 0;
    const byDay = {};

    if (inc.metric === 'rides') {
        current = inRange.length;
    } else if (inc.metric === 'distance') {
        const km = inRange.reduce((s, r) => s + r.km, 0);
        current = round2(inc.distanceUnit === 'mi' ? km / KM_PER_MI : km);
    } else {
        inRange.forEach((r) => {
            const k = toYmd(r.at);
            byDay[k] = (byDay[k] || 0) + 1;
        });
        const need = inc.minRidesPerDay || 1;
        current = Object.values(byDay).filter((c) => c >= need).length;
    }

    return { current, byDay };
};

// Card ka state: completed | in_progress | upcoming | expired
const stateFor = (inc, allDone, ctx) => {
    if (allDone) return 'completed';
    if (ctx.isFuture) return 'upcoming';
    if (ctx.isPast) return 'expired';

    // Aaj ka daily card + time window
    if (ctx.isToday && inc.period === 'daily') {
        const s = hhmmToMin(inc.timeWindowStart);
        const e = hhmmToMin(inc.timeWindowEnd);
        if (s !== null && e !== null && s <= e) {
            const m = minutesOfDay(new Date());
            if (m < s) return 'upcoming';
            if (m > e) return 'expired';
        }
    }
    return 'in_progress';
};

const buildItem = (inc, prog, ctx) => {
    const tiers = sortedTiers(inc);
    const word = unitWord(inc);
    const top = tiers.length ? tiers[tiers.length - 1].target : 0;

    let firstPendingSeen = false;
    const milestones = tiers.map((t) => {
        const done = prog.current >= t.target;
        const remaining = done ? 0 : round2(t.target - prog.current);
        const isCurrent = !done && !firstPendingSeen;
        if (!done) firstPendingSeen = true;

        return {
            target: t.target,
            label: `Complete ${t.target} ${unitWordN(inc, t.target)}`,
            reward: t.reward,
            status: done ? 'completed' : 'pending',
            isCompleted: done,
            isCurrent,
            remaining,
            remainingText: done ? null : `${remaining} more ${unitWordN(inc, remaining).toLowerCase()} left`,
        };
    });

    const allDone = tiers.length > 0 && milestones.every((m) => m.isCompleted);
    const earned = round2(milestones.filter((m) => m.isCompleted).reduce((s, m) => s + m.reward, 0));

    const item = {
        incentiveId: String(inc._id),
        period: inc.period,
        title: displayTitle(inc),
        subtitle: displaySubtitle(inc),
        bonusName: bonusNameOf(inc),
        metric: inc.metric,
        unit: inc.metric === 'distance' ? (inc.distanceUnit === 'mi' ? 'miles' : 'km') : inc.metric,
        currency: CURRENCY,
        maxReward: maxRewardOf(inc),
        earned,
        status: stateFor(inc, allDone, ctx),
        isCompleted: allDone,
        timeWindow:
            hhmmToMin(inc.timeWindowStart) !== null && hhmmToMin(inc.timeWindowEnd) !== null
                ? {
                    start: inc.timeWindowStart,
                    end: inc.timeWindowEnd,
                    label: `${fmt12(inc.timeWindowStart)} To ${fmt12(inc.timeWindowEnd)}`,
                }
                : null,
        progress: {
            current: prog.current,
            target: top,
            text: `${prog.current} / ${top} ${word.toLowerCase()}`,
            percent: top ? Math.min(100, Math.round((prog.current / top) * 100)) : 0,
        },
        milestones,
    };

    return item;
};

// ---------------------------------------------------------------------
// DAILY TAB
// ---------------------------------------------------------------------
const getDailyView = async (driverId, dateYmd) => {
    const today = todayYmd();
    const date = dateYmd || today;
    const weekStart = weekStartOf(date);

    // Date strip: selected date wale hafte ke 7 din
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStart, i);
        return {
            date: d,
            day: dayName(d),
            dayNumber: Number(d.slice(8)),
            isToday: d === today,
            isSelected: d === date,
            isFuture: d > today,
        };
    });

    const wd = weekdayOf(date);
    const found = await Incentive.find({
        period: 'daily',
        isActive: true,
        isDeleted: false,
        validFrom: { $lte: dayEndOf(date) },
        validTo: { $gte: dayStartOf(date) },
    })
        .sort('sortOrder createdAt')
        .lean();

    const applicable = found.filter((i) => !i.daysOfWeek || !i.daysOfWeek.length || i.daysOfWeek.includes(wd));
    const rides = applicable.length ? await loadRides(driverId, dayStartOf(date), dayEndOf(date)) : [];

    const ctx = { isToday: date === today, isFuture: date > today, isPast: date < today };

    const incentives = applicable
        .map((inc) => buildItem(inc, computeProgress(inc, rides), ctx))
        // time window ke hisaab se upar se neeche (06:00 AM, 05:00 PM ...)
        .sort((a, b) => {
            const sa = a.timeWindow ? hhmmToMin(a.timeWindow.start) : -1;
            const sb = b.timeWindow ? hhmmToMin(b.timeWindow.start) : -1;
            return sa - sb;
        });

    return {
        selectedDate: date,
        title: date === today ? `Today, ${shortDate(date)}` : `${dayName(date)}, ${shortDate(date)}`,
        days,
        incentives,
    };
};

// ---------------------------------------------------------------------
// WEEKLY TAB
// ---------------------------------------------------------------------
const getWeeklyView = async (driverId, dateYmd) => {
    const today = todayYmd();
    const currentWeekStart = weekStartOf(today);
    const selectedStart = weekStartOf(dateYmd || today);
    const selectedEnd = addDays(selectedStart, 6);

    // Week strip: pichhle 4 hafte + is hafte + agla hafta  (8-14, 15-21, 22-28 ...)
    const weeks = [-4, -3, -2, -1, 0, 1].map((k) => {
        const ws = addDays(currentWeekStart, k * 7);
        const we = addDays(ws, 6);
        return {
            weekStart: ws,
            weekEnd: we,
            label: `${Number(ws.slice(8))}-${Number(we.slice(8))}`,
            isCurrent: k === 0,
            isSelected: ws === selectedStart,
        };
    });

    const found = await Incentive.find({
        period: 'weekly',
        isActive: true,
        isDeleted: false,
        validFrom: { $lte: dayEndOf(selectedEnd) },
        validTo: { $gte: dayStartOf(selectedStart) },
    })
        .sort('sortOrder createdAt')
        .lean();

    const rides = found.length ? await loadRides(driverId, dayStartOf(selectedStart), dayEndOf(selectedEnd)) : [];

    const ctx = { isToday: false, isFuture: selectedStart > today, isPast: selectedEnd < today };

    const incentives = found.map((inc) => {
        const prog = computeProgress(inc, rides);
        const item = buildItem(inc, prog, ctx);

        // "1 ride/day for 7 days" -> Day 1 ... Day 7
        if (inc.metric === 'days') {
            const need = inc.minRidesPerDay || 1;
            item.days = Array.from({ length: 7 }, (_, i) => {
                const d = addDays(selectedStart, i);
                const done = (prog.byDay[d] || 0) >= need;
                return {
                    day: i + 1,
                    label: `Day ${i + 1}`,
                    date: d,
                    status: done ? 'completed' : d < today ? 'missed' : 'pending',
                    isCompleted: done,
                };
            });
            item.completedDays = prog.current;
        } else {
            item.days = null;
        }
        return item;
    });

    return {
        selectedWeek: {
            weekStart: selectedStart,
            weekEnd: selectedEnd,
            title: `${dayName(selectedStart)}, ${shortDate(selectedStart)} To ${dayName(selectedEnd)}, ${shortDate(selectedEnd)}`,
        },
        weeks,
        incentives,
    };
};

// ---------------------------------------------------------------------
// BONUS TAB (+ Bonus history)
// ---------------------------------------------------------------------
const getBonusView = async (driverId, page = 1, limit = 20) => {
    const now = new Date();

    const found = await Incentive.find({
        period: 'bonus',
        isActive: true,
        isDeleted: false,
        validFrom: { $lte: now },
        validTo: { $gte: now },
    })
        .sort('sortOrder createdAt')
        .lean();

    const incentives = [];
    for (const inc of found) {
        const rides = await loadRides(driverId, new Date(inc.validFrom), new Date(inc.validTo));
        const item = buildItem(inc, computeProgress(inc, rides), { isToday: false, isFuture: false, isPast: false });
        item.validFrom = inc.validFrom;
        item.validTo = inc.validTo;
        item.validTill = longDate(toYmd(inc.validTo));
        incentives.push(item);
    }

    const history = await getHistory(driverId, page, limit);

    return { incentives, ...history };
};

// Bonus history (saare period ke mile hue rewards, naya upar)
const getHistory = async (driverId, page = 1, limit = 20) => {
    const p = Math.max(parseInt(page) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const skip = (p - 1) * l;

    const filter = { driver: driverId };

    const [rows, total, sum] = await Promise.all([
        Reward.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
        Reward.countDocuments(filter),
        Reward.aggregate([
            { $match: { driver: new mongoose.Types.ObjectId(String(driverId)) } },
            { $group: { _id: null, total: { $sum: '$reward' } } },
        ]),
    ]);

    return {
        totalEarned: round2((sum[0] && sum[0].total) || 0),
        currency: CURRENCY,
        history: rows.map((r) => ({
            id: String(r._id),
            title: r.title || `${CURRENCY}${money(r.reward)} ${r.bonusName || 'Bonus'}`,
            subtitle: 'Completed',
            label: r.label,
            amount: r.reward,
            period: r.period,
            date: r.createdAt,
            dateText: longDate(toYmd(r.createdAt)),
        })),
        pagination: {
            currentPage: p,
            limit: l,
            totalPages: Math.ceil(total / l),
            totalItems: total,
            hasMore: skip + rows.length < total,
        },
    };
};

// ---------------------------------------------------------------------
// REWARD PAYOUT — ride complete hone ke baad call karo
// ---------------------------------------------------------------------
const creditTier = async (driverId, inc, periodKey, tier) => {
    const label = `Complete ${tier.target} ${unitWordN(inc, tier.target)}`;
    const name = bonusNameOf(inc);

    let doc;
    try {
        doc = await Reward.create({
            driver: driverId,
            incentive: inc._id,
            period: inc.period,
            periodKey,
            tierTarget: tier.target,
            reward: tier.reward,
            bonusName: name,
            title: `${CURRENCY}${money(tier.reward)} ${name}`,
            label,
        });
    } catch (e) {
        if (e && e.code === 11000) return null; // pehle hi mil chuka hai
        throw e;
    }

    try {
        if (tier.reward > 0) {
            const wallet = await Wallet.create({
                driverId,
                type: 'add',
                amount: Math.round(tier.reward * 100), // cents/paise
                status: 'completed',
                description: `${name} - ${label}`,
            });
            doc.walletId = wallet._id;
            await doc.save();
        }
    } catch (e) {
        await Reward.deleteOne({ _id: doc._id }); // wallet fail hua to agli ride par dobara try hoga
        throw e;
    }

    return doc;
};

const processRideCompletion = async (driverId, ride) => {
    const at = new Date((ride && ride.completedAt) || Date.now());
    const ymd = toYmd(at);

    const incentives = await Incentive.find({
        isActive: true,
        isDeleted: false,
        validFrom: { $lte: at },
        validTo: { $gte: at },
    }).lean();

    const credited = [];

    for (const inc of incentives) {
        let start, end, periodKey;

        if (inc.period === 'daily') {
            if (inc.daysOfWeek && inc.daysOfWeek.length && !inc.daysOfWeek.includes(weekdayOf(ymd))) continue;
            start = dayStartOf(ymd);
            end = dayEndOf(ymd);
            periodKey = ymd;
        } else if (inc.period === 'weekly') {
            const ws = weekStartOf(ymd);
            start = dayStartOf(ws);
            end = dayEndOf(addDays(ws, 6));
            periodKey = ws;
        } else {
            start = new Date(inc.validFrom);
            end = new Date(inc.validTo);
            periodKey = 'all';
        }

        const rides = await loadRides(driverId, start, end);
        const prog = computeProgress(inc, rides);

        for (const tier of sortedTiers(inc)) {
            if (prog.current >= tier.target) {
                const doc = await creditTier(driverId, inc, periodKey, tier);
                if (doc) credited.push(doc);
            }
        }
    }

    return credited;
};

module.exports = {
    // driver APIs
    getDailyView,
    getWeeklyView,
    getBonusView,
    getHistory,
    processRideCompletion,

    // admin / helpers
    isValidYmd,
    toYmd,
    dayStartOf,
    dayEndOf,
    displayTitle,
    displaySubtitle,
    bonusNameOf,
    unitWord,
    maxRewardOf,
    sortedTiers,
    hhmmToMin,
    fmt12,
    CURRENCY,

    // tests
    _internals: { computeProgress, buildItem, weekStartOf, addDays, parseDistanceKm, inWindow, TZ },
};