const createError = require('http-errors');
const multilingualUser = require('../../utils/multilingualUser');
const formatTimestamp = require('../../utils/formatTimestamp');

const Country = require('../../models/countryModel');
const City = require('../../models/cityModel');
const Banner = require('../../models/bannerModel');
const Notification = require('../../models/notificationModel');


exports.getSelectCountryCity = async (req, res, next) => {
    try {
        // Sirf user ke profile mein jo city & country hai wo return karo
        await req.user.populate('city country');
        const user = multilingualUser(req.user, req);

        res.json({
            code: '1',
            message: req.t('success'),
            data: {
                city: user.city || null,
                country: user.country || null,
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.postSelectCountryCity = async (req, res, next) => {
    try {
        const { city_id, country_id } = req.body;

        if (!city_id || !country_id) {
            return next(createError.BadRequest('city_id and country_id are required'));
        }

        const [city, country] = await Promise.all([
            City.findOne({ city_id }),
            Country.findOne({ country_id }),
        ]);

        if (!city) return next(createError.BadRequest('Invalid city_id'));
        if (!country) return next(createError.BadRequest('Invalid country_id'));

        // Update user
        let user = req.user;
        user.city = city._id;
        user.country = country._id;
        await user.save();

        await user.populate('city country');
        user = multilingualUser(user, req);

        res.json({
            code: '1',
            message: req.t('success'),
            data: {
                city: user.city,
                country: user.country,
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.getBanners = async (req, res, next) => {
    try {
        let banners = await Banner.find().sort('-_id');
        banners = banners.map(el => el.image);

        res.json({ code: '1', message: req.t('success'), data: { banners } });
    } catch (error) {
        next(error);
    }
};

// exports.getNotifications = async (req, res, next) => {
//     try {
//         const notifications = await Notification.find({ user: req.user.id })
//             .select('-__v -user')
//             .sort('-_id')
//             .populate('car', 'pics')
//             .lean();

//         // Format timestamps
//         notifications.forEach(notification => {
//             notification.image = notification.car?.pics[0];
//             notification.car = undefined;

//             notification.createdAt = formatTimestamp(
//                 notification.updatedAt,
//                 req
//             );
//         });

//         res.json({ code: '1', message: req.t('success'), notifications });
//     } catch (error) {
//         next(error);
//     }
// };


// exports.getNotifications = async (req, res, next) => {
//     try {
//         console.log('=== GET NOTIFICATIONS ===');
//         console.log('User ID:', req.user.id);

//         const notifications = await Notification.find({ user: req.user.id })
//             .select('-__v -user')
//             .sort('-_id')
//             .populate('car', 'pics')
//             .lean();

//         console.log('Notifications found:', notifications.length);
//         console.log('Sample:', JSON.stringify(notifications[0], null, 2));

//         // Format timestamps
//         notifications.forEach(notification => {
//             notification.image = notification.car?.pics[0];
//             notification.car = undefined;

//             notification.createdAt = formatTimestamp(
//                 notification.updatedAt,
//                 req
//             );
//         });

//         res.json({ code: '1', message: req.t('success'), notifications });
//     } catch (error) {
//         next(error);
//     }
// };


exports.getNotifications = async (req, res, next) => {
    try {
        console.log('=== GET NOTIFICATIONS DEBUG ===');
        console.log('req.user.id:', req.user.id);
        console.log('req.user._id:', req.user._id);

        // ✅ Pehle bina filter ke sab dekho
        const allNotifications = await Notification.find({}).limit(5).lean();
        console.log('Total notifications in DB (first 5):');
        allNotifications.forEach(n => {
            console.log({
                _id: n._id,
                user: n.user,
                driver: n.driver,
                title: n.title
            });
        });

        // ✅ Ab user filter se dekho
        const notifications = await Notification.find({ user: req.user.id })
            .select('-__v -user')
            .sort('-_id')
            .populate('car', 'pics')
            .lean();

        console.log('Notifications for this user:', notifications.length);

        notifications.forEach(notification => {
            notification.image = notification.car?.pics[0];
            notification.car = undefined;
            notification.createdAt = formatTimestamp(notification.updatedAt, req);
        });

        res.json({ code: '1', message: req.t('success'), notifications });
    } catch (error) {
        next(error);
    }
};