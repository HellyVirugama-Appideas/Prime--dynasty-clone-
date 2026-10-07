const Ride = require('../../models/rideModel');
const Commission = require('../../models/commissionModel');

// GET - Fare / Trip-type Reports Page
exports.getFareReports = async (req, res) => {
    try {
        const range = req.query.range || 'monthly'; // daily | weekly | monthly
        const now = new Date();
        let from;
        if (range === 'daily') {
            from = new Date(now);
            from.setHours(0, 0, 0, 0);
        } else if (range === 'weekly') {
            from = new Date(now);
            from.setDate(from.getDate() - 7);
        } else {
            from = new Date(now);
            from.setMonth(from.getMonth() - 1);
        }

        const commission = await Commission.findOne();
        const commissionPct =
            commission && commission.commissionType === 'percentage' ? Number(commission.rideCommission) || 0 : 0;

        const matchStage = {
            createdAt: { $gte: from },
            status: 'Completed',
        };

        // Trip-type-wise booking count + revenue split (base fare, distance
        // charge, platform fee earnings, total revenue) + driver payout summary.
        const tripTypeStats = await Ride.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $ifNull: ['$tripType', 'Unclassified'] },
                    bookings: { $sum: 1 },
                    totalBaseFare: { $sum: { $ifNull: ['$baseFare', 0] } },
                    totalDistanceCharge: { $sum: { $ifNull: ['$distanceCharge', 0] } },
                    totalPlatformFee: { $sum: { $ifNull: ['$platformFee', 0] } },
                    totalRevenue: { $sum: { $ifNull: ['$estimatedTotal', '$price'] } },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        let grandTotalRevenue = 0;
        let grandTotalPlatformFee = 0;
        let grandTotalBookings = 0;

        const rows = tripTypeStats.map((row) => {
            const driverPayout = Number((row.totalRevenue - row.totalPlatformFee).toFixed(2));
            const platformCommission = Number(((driverPayout * commissionPct) / 100).toFixed(2));
            grandTotalRevenue += row.totalRevenue;
            grandTotalPlatformFee += row.totalPlatformFee;
            grandTotalBookings += row.bookings;
            return {
                tripType: row._id,
                bookings: row.bookings,
                totalBaseFare: Number(row.totalBaseFare.toFixed(2)),
                totalDistanceCharge: Number(row.totalDistanceCharge.toFixed(2)),
                totalPlatformFee: Number(row.totalPlatformFee.toFixed(2)),
                totalRevenue: Number(row.totalRevenue.toFixed(2)),
                driverPayout,
                platformCommission,
            };
        });

        res.render('fareReports', {
            title: 'Fare & Trip Reports',
            range,
            rows,
            grandTotalRevenue: Number(grandTotalRevenue.toFixed(2)),
            grandTotalPlatformFee: Number(grandTotalPlatformFee.toFixed(2)),
            grandTotalBookings,
            commissionPct,
        });
    } catch (error) {
        console.error('[Reports] getFareReports error:', error);
        req.flash('red', error.message);
        res.redirect('/admin');
    }
};
