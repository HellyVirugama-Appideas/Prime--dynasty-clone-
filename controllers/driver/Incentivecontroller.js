const createError = require('http-errors');
const incentiveService = require('../../utils/Incentiveservice');

// checkDriver middleware se aaya hua driver. Nahi mila to saaf error (crash nahi)
const getDriverId = (req) => (req.driver ? req.driver.id || String(req.driver._id) : null);

const unauthorized = () =>
    createError.Unauthorized('Driver not authenticated. Send a valid "token" header (route me checkDriver lagana zaroori hai).');

// GET /api/driver/incentives/daily?date=2026-02-16     (date optional, default aaj)
exports.getDaily = async (req, res, next) => {
    try {
        const driverId = getDriverId(req);
        if (!driverId) return next(unauthorized());

        const { date } = req.query;
        if (date && !incentiveService.isValidYmd(date))
            return next(createError.BadRequest('date must be in YYYY-MM-DD format.'));

        const data = await incentiveService.getDailyView(driverId, date);

        res.json({ code: '1', message: req.t('success'), data });
    } catch (error) {
        next(error);
    }
};

// GET /api/driver/incentives/weekly?date=2026-02-18    (hafte ka koi bhi din, default is hafta)
exports.getWeekly = async (req, res, next) => {
    try {
        const driverId = getDriverId(req);
        if (!driverId) return next(unauthorized());

        const date = req.query.date || req.query.weekStart;
        if (date && !incentiveService.isValidYmd(date))
            return next(createError.BadRequest('date must be in YYYY-MM-DD format.'));

        const data = await incentiveService.getWeeklyView(driverId, date);

        res.json({ code: '1', message: req.t('success'), data });
    } catch (error) {
        next(error);
    }
};

// GET /api/driver/incentives/bonus?page=1&limit=20     (bonus cards + Bonus history)
exports.getBonus = async (req, res, next) => {
    try {
        const driverId = getDriverId(req);
        if (!driverId) return next(unauthorized());

        const { page = 1, limit = 20 } = req.query;

        const data = await incentiveService.getBonusView(driverId, page, limit);

        res.json({ code: '1', message: req.t('success'), data });
    } catch (error) {
        next(error);
    }
};