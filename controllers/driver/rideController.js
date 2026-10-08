// const createError = require('http-errors');
// const multilingual = require('../../utils/multilingual');
// const { sendRideNotification } = require('../../utils/sendNotification');
// const generateCode = require('../../utils/generateCode');

// const Ride = require('../../models/rideModel');
// const RideReq = require('../../models/rideReqModel');
// const Driver = require('../../models/driverModel');
// const User = require('../../models/userModel');
// const Transaction = require("../../models/transaction")
// const Offer = require('../../models/offerModel');
// const UserOfferProgress = require('../../models/userOfferProgressModel');
// const geolib = require('geolib');

// const FareConfig = require('../../models/fareConfigModel');
// const { calculateFare, getActiveFareConfig } = require('../../utils/fareEngine');
// const { autoApplyProgressRewards } = require('../../utils/rewardAutoApply');
// const { processRideCompletion } = require('../../utils/Incentiveservice');


// // exports.getRides = async (req, res, next) => {
// //     try {
// //         const rides = await Ride.find({ driver: req.driver.id })
// //             .populate('user', 'name profile phone')
// //             .select('-driver -__v -otp')
// //             .sort('-_id');

// //         const updatedRides = await Promise.all(
// //             rides.map(async (ride) => {

// //                 const transaction = await Transaction.findOne({
// //                     rideId: ride._id
// //                 }).sort({ createdAt: -1 });

// //                 return {
// //                     ...ride.toObject(),

// //                     driverId: req.driver.id,

// //                     // ✅ payment
// //                     paymentMethod: transaction?.source || transaction?.paymentMethod || transaction?.method || null,
// //                     paymentStatus: transaction?.status || null,
// //                     amount: transaction?.amount || null,

// //                     // 🔥 ONLY upcoming rides ke liye
// //                     scheduledTime: ride.status?.toLowerCase() === "upcoming"
// //                         ? ride.scheduleTime
// //                         : null
// //                 };
// //             })
// //         );

// //         res.json({
// //             code: '1',
// //             message: req.t('success'),
// //             rides: updatedRides
// //         });

// //     } catch (error) {
// //         next(error);
// //     }
// // };

// // const getRideFareDetails = async (doc, fareConfig) => {
// //     let baseFare = Number(doc.baseFare) || 0;
// //     let distanceCharge = Number(doc.distanceCharge) || 0;
// //     let platformFee = Number(doc.platformFee) || 0;
// //     let surgeCharge = Number(doc.surgeCharge) || 0;
// //     let total = Number(doc.estimatedTotal) || 0;
// //     let tripType = doc.tripType || null;
// //     let distanceKm = null;

// //     const coords = [doc.pickupLat, doc.pickupLng, doc.endLat, doc.endLng].map(Number);
// //     const hasCoords = coords.every((n) => Number.isFinite(n) && n !== 0);

// //     if (hasCoords) {
// //         distanceKm = Number(
// //             (
// //                 geolib.getDistance(
// //                     { latitude: coords[0], longitude: coords[1] },
// //                     { latitude: coords[2], longitude: coords[3] }
// //                 ) / 1000
// //             ).toFixed(2)
// //         );
// //     }

// //     if (!total && hasCoords) {
// //         const cfg = fareConfig || (await getActiveFareConfig(FareConfig));
// //         const f = calculateFare({ distanceKm, fareConfig: cfg });
// //         ({ baseFare, distanceCharge, platformFee, surgeCharge } = f);
// //         total = f.estimatedTotal;
// //         tripType = tripType || f.tripType;
// //     }

// //     if (!total) total = Number(doc.price) || 0;

// //     return {
// //         tripType,
// //         distanceKm,
// //         baseFare,
// //         distanceCharge,
// //         platformFee,
// //         surgeCharge,
// //         total,
// //         currency: '₹',
// //     };
// // };

// const getRideFareDetails = async (doc, fareConfig) => {
//     let baseFare = Number(doc.baseFare) || 0;
//     let distanceCharge = Number(doc.distanceCharge) || 0;
//     let platformFee = Number(doc.platformFee) || 0;
//     let surgeCharge = Number(doc.surgeCharge) || 0;
//     let total = Number(doc.estimatedTotal) || 0;
//     let tripType = doc.tripType || null;
//     let distanceKm = null;
 
//     const coords = [doc.pickupLat, doc.pickupLng, doc.endLat, doc.endLng].map(Number);
//     const hasCoords = coords.every((n) => Number.isFinite(n) && n !== 0);
 
//     if (hasCoords) {
//         distanceKm = Number(
//             (
//                 geolib.getDistance(
//                     { latitude: coords[0], longitude: coords[1] },
//                     { latitude: coords[2], longitude: coords[3] }
//                 ) / 1000
//             ).toFixed(2)
//         );
//     }
 
//     if (!total && hasCoords) {
//         const cfg = fareConfig || (await getActiveFareConfig(FareConfig));
//         const f = calculateFare({ distanceKm, fareConfig: cfg });
//         ({ baseFare, distanceCharge, platformFee, surgeCharge } = f);
//         total = f.estimatedTotal;
//         tripType = tripType || f.tripType;
//     }
 
//     if (!total) total = Number(doc.price) || 0;
 
//     return {
//         tripType,
//         distanceKm,
//         baseFare,
//         distanceCharge,
//         platformFee,
//         surgeCharge,
//         total,
//         currency: '₹',
//     };
// };

// const ACT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// const ACT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// // Date -> { y, mo, d, h, mi, wd } (tz minutes ho to us timezone me, warna server local)
// const actParts = (date, tz) => {
//     if (tz !== null) {
//         const x = new Date(date.getTime() + tz * 60000);
//         return {
//             y: x.getUTCFullYear(), mo: x.getUTCMonth(), d: x.getUTCDate(),
//             h: x.getUTCHours(), mi: x.getUTCMinutes(), wd: x.getUTCDay(),
//         };
//     }
//     return {
//         y: date.getFullYear(), mo: date.getMonth(), d: date.getDate(),
//         h: date.getHours(), mi: date.getMinutes(), wd: date.getDay(),
//     };
// };

// const actPad = (n) => String(n).padStart(2, '0');
// const actDateKey = (p) => `${p.y}-${actPad(p.mo + 1)}-${actPad(p.d)}`;

// // 14:05 -> "2:05 pm"
// const actTime = (p) => {
//     const h12 = p.h % 12 === 0 ? 12 : p.h % 12;
//     return `${h12}:${actPad(p.mi)} ${p.h >= 12 ? 'pm' : 'am'}`;
// };

// // "33 min 45 sec" / "1 hr 5 mins" / "00:45:10" / "45" (minutes) -> seconds
// const actDurationSeconds = (value) => {
//     if (value === undefined || value === null) return 0;
//     const str = String(value).toLowerCase().trim();
//     if (!str) return 0;

//     const clock = str.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
//     if (clock) {
//         return clock[3] !== undefined
//             ? Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3])
//             : Number(clock[1]) * 60 + Number(clock[2]);
//     }

//     const h = str.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/);
//     const m = str.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/);
//     const s = str.match(/(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)\b/);
//     if (h || m || s) {
//         return Math.round(
//             (h ? parseFloat(h[1]) * 3600 : 0) +
//             (m ? parseFloat(m[1]) * 60 : 0) +
//             (s ? parseFloat(s[1]) : 0)
//         );
//     }

//     const plain = parseFloat(str); // sirf number -> minutes
//     return Number.isFinite(plain) ? Math.round(plain * 60) : 0;
// };

// // 2025 -> "33 min 45 sec" (design jaisa), 1 ghante se zyada -> "1 hr 05 min"
// const actFormatDuration = (sec) => {
//     if (!sec) return null;
//     const h = Math.floor(sec / 3600);
//     const m = Math.floor((sec % 3600) / 60);
//     const s = sec % 60;
//     return h > 0 ? `${h} hr ${actPad(m)} min` : `${actPad(m)} min ${actPad(s)} sec`;
// };

// // "6.4 km" / "3 mi" / "850 m" / "6.4" -> km
// const actDistanceKm = (value) => {
//     if (value === undefined || value === null) return null;
//     const str = String(value).toLowerCase().replace(/,/g, '');
//     const num = parseFloat(str);
//     if (!Number.isFinite(num)) return null;
//     if (/\b(mi|mile|miles)\b/.test(str)) return num * 1.609344;
//     if (/\d\s*m(?!i)\b/.test(str) && !/km/.test(str)) return num / 1000;
//     return num;
// };

// const actCapitalize = (t) => (t ? String(t).charAt(0).toUpperCase() + String(t).slice(1) : null);

// // ---------------------------------------------------------------------
// // STEP 3 — UPDATED: getRides (purane ko isse replace karo)
// // ---------------------------------------------------------------------
// exports.getRides = async (req, res, next) => {
//     try {
//         const tzRaw = req.query.tzOffset;
//         const tz =
//             tzRaw !== undefined && tzRaw !== '' && Number.isFinite(Number(tzRaw))
//                 ? Number(tzRaw)
//                 : null;

//         const rides = await Ride.find({ driver: req.driver.id })
//             .populate('user', 'name profile phone')
//             .select('-driver -__v -otp')
//             .sort('-_id');

//         // Saari rides ke transactions ek hi query me (N+1 se bachne ke liye)
//         const transactions = await Transaction.find({
//             rideId: { $in: rides.map((r) => r._id) },
//         }).sort({ createdAt: -1 });

//         const txByRide = {};
//         transactions.forEach((t) => {
//             const key = String(t.rideId);
//             if (!txByRide[key]) txByRide[key] = t; // latest transaction
//         });

//         const fareConfig = await getActiveFareConfig(FareConfig);
//         const todayKey = actDateKey(actParts(new Date(), tz));

//         const items = [];

//         for (const ride of rides) {
//             const transaction = txByRide[String(ride._id)];
//             const fare = await getRideFareDetails(ride, fareConfig);

//             // Trip date: complete hui ho to completedAt, schedule ride ho to scheduleTime, warna createdAt
//             const tripDate = new Date(
//                 ride.completedAt || (ride.isSchedule && ride.scheduleTime) || ride.createdAt || Date.now()
//             );
//             const p = actParts(tripDate, tz);
//             const dateKey = actDateKey(p);

//             const durationSeconds = actDurationSeconds(ride.time);
//             const km = actDistanceKm(ride.distance);
//             const distanceKm = km !== null ? Number(km.toFixed(1)) : fare.distanceKm;

//             const paymentMethodRaw =
//                 transaction?.source || transaction?.paymentMethod || transaction?.method || ride.paymentMethod || null;

//             const driverEarning =
//                 transaction && transaction.driverAmount
//                     ? Number((transaction.driverAmount / 100).toFixed(2))
//                     : null;

//             // ✅ Activity card + Trip Details screen ka data
//             const item = {
//                 rideId: ride.id,
//                 status: ride.status,
//                 rideStatus: ride.rideStatus,

//                 tripDate,
//                 date: dateKey,
//                 dateTitle: dateKey === todayKey
//                     ? 'Today'
//                     : `${ACT_DAYS[p.wd]}, ${ACT_MONTHS[p.mo]} ${p.d}`,
//                 tripTime: actTime(p), // "12:14 pm" (ride.time purana duration field alag rehta hai)

//                 total: fare.total,
//                 earn: fare.total,
//                 driverEarning,
//                 currency: fare.currency,

//                 duration: actFormatDuration(durationSeconds), // "33 min 45 sec"
//                 durationSeconds,
//                 distance: distanceKm !== null && distanceKm !== undefined ? `${distanceKm.toFixed(1)} km` : null, // "6.4 km"
//                 distanceKm,

//                 pickup: {
//                     address: ride.pickupAddress,
//                     latitude: Number(ride.pickupLat),
//                     longitude: Number(ride.pickupLng),
//                 },
//                 drop: {
//                     address: ride.endAddress,
//                     latitude: Number(ride.endLat),
//                     longitude: Number(ride.endLng),
//                 },

//                 user: ride.user
//                     ? {
//                         id: ride.user.id,
//                         name: ride.user.name,
//                         profile: ride.user.profile,
//                         phone: ride.user.phone,
//                     }
//                     : null,

//                 paymentMethod: actCapitalize(paymentMethodRaw), // "Cash"
//                 paymentStatus: transaction?.status || null,

//                 // Fare Details
//                 baseFare: fare.baseFare,
//                 distanceCharge: fare.distanceCharge,
//                 platformFee: fare.platformFee,
//                 surgeCharge: fare.surgeCharge,
//                 tripType: fare.tripType,
//                 fareDetails: {
//                     baseFare: fare.baseFare,
//                     distanceCharge: fare.distanceCharge,
//                     platformFee: fare.platformFee,
//                     surgeCharge: fare.surgeCharge,
//                     total: fare.total,
//                 },
//             };

//             items.push({ item, ride, transaction, tripDate });
//         }

//         // Naya trip upar (design jaisa)
//         items.sort((a, b) => b.tripDate - a.tripDate);

//         // ✅ Date-wise groups: Today, Tue Aug 9, ...
//         const groups = [];
//         const groupIndex = {};
//         items.forEach(({ item }) => {
//             if (groupIndex[item.date] === undefined) {
//                 groupIndex[item.date] = groups.length;
//                 groups.push({ date: item.date, title: item.dateTitle, rides: [] });
//             }
//             groups[groupIndex[item.date]].rides.push(item);
//         });

//         // ✅ Purani flat list (backward compatible) + naye fields
//         const updatedRides = items.map(({ item, ride, transaction }) => ({
//             ...ride.toObject(),
//             ...item,

//             driverId: req.driver.id,

//             // purane fields jaise the
//             paymentMethod: item.paymentMethod,
//             paymentStatus: transaction?.status || null,
//             amount: transaction?.amount || null,

//             scheduledTime:
//                 ride.status?.toLowerCase() === 'upcoming' ? ride.scheduleTime : null,
//         }));

//         res.json({
//             code: '1',
//             message: req.t('success'),
//             activity: groups,
//             rides: updatedRides,
//         });
//     } catch (error) {
//         next(error);
//     }
// };


// exports.verifyRideOTP = async (req, res, next) => {
//     try {
//         const ride = await Ride.findById(req.body.rideId)
//             .populate('user', 'name profile phone fcmToken')
//             .select('-driver -__v')
//             .sort('-_id');

//         if (Number(req.body.otp) !== ride.otp)
//             return next(createError.BadRequest('Invalid OTP.'));

//         // Update ride status
//         ride.rideStatus = 'start';
//         await ride.save();

//         // Notify user
//         const notificationData = {
//             code: '1',
//             title: 'Ride Status',
//             body: 'Your ride is on the way.',
//             rideId: ride._id.toString(),
//             rideStatus: ride.rideStatus,
//         };

//         await sendRideNotification(ride.user?.fcmToken, notificationData);

//         io.to(ride.user.id).emit('rideStatusNotify', {
//             rideId: ride.id,
//             rideStatus: ride.rideStatus,
//         });

//         res.json({ code: '1', message: req.t('success'), ride });
//     } catch (error) {
//         next(error);
//     }
// };

// exports.driverResponse = async (req, res, next) => {
//     try {
//         const { driverId, rideId, response, time, distance, userId } = req.body;
//         const isSchedule = req.body.isSchedule === 'true';

//         if (!driverId || !rideId || !response)
//             return next(createError.BadRequest('Invalid request data.'));

//         const driver = await Driver.findById(driverId);
//         if (!driver) return next(createError.BadRequest('Driver not found.'));

//         const ride = await RideReq.findById(rideId);
//         if (!ride) return next(createError.BadRequest('Ride not found.'));

//         const isScheduledRide = isSchedule || !!ride.scheduleTime || !!ride.scheduledDate || !!ride.isSchedule;

//         // if (response === 'accept') {
//         //     // if (ride.acceptedBy) {
//         //     //     // Ride has already been accepted by another driver
//         //     //     return res.json({
//         //     //         code: '0',
//         //     //         message: req.t('ride.already'),
//         //     //     });
//         //     // }
//         //     // ride.acceptedBy = driverId;
//         //     // await ride.save();

//         //     // await Driver.findByIdAndUpdate(driver.id, {
//         //     //     isHandlingRequest: true,
//         //     // });

//         //     let rideResponse = await Ride.create({
//         //         ...ride._doc,
//         //         driver: driverId,
//         //         time,
//         //         distance,
//         //         otp: generateCode(6),
//         //         // status: isSchedule ? 'Upcoming' : 'Ongoing',
//         //         status: 'Upcoming',
//         //         rideStatus: 'start',
//         //     });

//         //     if (!isSchedule)
//         //         await Driver.findByIdAndUpdate(driverId, { status: 'busy' });

//         //     await rideResponse.populate({
//         //         path: 'driver',
//         //         populate: {
//         //             path: 'type',
//         //             select: '-__v -distanceRate -typeFor -capacity',
//         //         },
//         //         select: 'name profile phone',
//         //     });
//         //     await rideResponse.populate({
//         //         path: 'user',
//         //         select: 'name phone',
//         //     });

//         //     rideResponse = rideResponse._doc;
//         //     rideResponse.type = multilingual(rideResponse.driver.type, req);
//         //     rideResponse.driver.type = undefined;
//         //     rideResponse.__v = undefined;

//         //     const user = await User.findById(userId);

//         //     const notificationData = {
//         //         code: '1',
//         //         message: req.t('success'),
//         //         title: 'Ride Accepted',
//         //         // body: req.t(isSchedule ? 'ride.schedule' : 'ride.success'),
//         //         body: 'Your ride has been successfully booked.',
//         //         ride: rideResponse,
//         //     };
//         //     await sendRideNotification(user.fcmToken, notificationData);

//         //     return res.json({
//         //         code: '1',
//         //         message: req.t('success'),
//         //         distance: distance,
//         //         time: time,
//         //     });
//         // } 
//         if (response === 'accept') {

//             let rideResponse = await Ride.create({
//                 ...ride._doc,
//                 driver: driverId,                    // ← Yeh line sahi hai
//                 time,
//                 distance,
//                 otp: generateCode(6),
//                 status: 'Upcoming',                  // ← Aap chahte the Upcoming
//                 rideStatus: 'start',                 // ← Yeh zaroori hai
//                 isSchedule: isScheduledRide,
//             });

//             if (!isSchedule)
//                 await Driver.findByIdAndUpdate(driverId, { status: 'busy' });

//             await rideResponse.populate({
//                 path: 'driver',
//                 populate: {
//                     path: 'type',
//                     select: '-__v -distanceRate -typeFor -capacity',
//                 },
//                 select: 'name profile phone',
//             });

//             await rideResponse.populate({
//                 path: 'user',
//                 select: 'name phone',
//             });

//             rideResponse = rideResponse._doc;
//             rideResponse.type = multilingual(rideResponse.driver.type, req);
//             rideResponse.driver.type = undefined;
//             rideResponse.__v = undefined;

//             const user = await User.findById(userId);

//             const notificationData = {
//                 code: '1',
//                 message: req.t('success'),
//                 title: 'Ride Accepted',
//                 body: 'Your ride has been successfully booked.',
//                 ride: rideResponse,
//                 user: userId,
//             };
//             await sendRideNotification(user.fcmToken, notificationData);



//             return res.json({
//                 code: '1',
//                 message: req.t('success'),
//                 distance: distance,
//                 time: time,
//             });
//         }

//         // else if (response === 'reject') {
//         //     const notificationData = {
//         //         code: '0',
//         //         title: 'Ride Fail',
//         //         body: req.t('ride.fail'),
//         //     };
//         //     await sendRideNotification(userId.fcmToken, notificationData);

//         //     return res.json({ code: '0', message: req.t('ride.rejected') });
//         // } 

//         else if (response === 'reject') {

//             const user = await User.findById(userId);

//             if (!user || !user.fcmToken) {
//                 return res.json({
//                     code: '0',
//                     message: 'User or FCM token not found'
//                 });
//             }

//             const notificationData = {
//                 code: '0',
//                 title: 'Ride Rejected',
//                 body: req.t('ride.fail'),
//                 user: userId,
//             };

//             await sendRideNotification(user.fcmToken, notificationData); // ✅ FIX

//             return res.json({ code: '0', message: req.t('ride.rejected') });
//         }


//         else {
//             return res.json({ code: '0', message: 'Invalid response.' });
//         }
//     } catch (error) {
//         next(error);
//     }
// };

// // ==================== START JOURNEY ====================
// // exports.startJourney = async (req, res, next) => {
// //     try {
// //         const { rideId } = req.body;

// //         // Get driverId safely
// //         let driverId = req.driver?._id || req.driver?.id;

// //         if (!driverId && req.headers.authorization) {
// //             try {
// //                 const token = req.headers.authorization.split(' ')[1];
// //                 const decoded = jwt.verify(token, process.env.JWT_SECRET);
// //                 driverId = decoded._id;
// //             } catch (e) {
// //                 console.log('Token decode failed');
// //             }
// //         }

// //         console.log('========== START JOURNEY API CALLED ==========');
// //         console.log('Ride ID:', rideId);
// //         console.log('Driver ID found:', driverId);

// //         if (!rideId) {
// //             return next(createError.BadRequest('rideId is required'));
// //         }

// //         if (!driverId) {
// //             return next(createError.Unauthorized('Driver authentication failed. Please login again.'));
// //         }

// //         // Find the ride with populated driver
// //         const ride = await Ride.findById(rideId)
// //             .populate('user', 'name phone fcmToken')
// //             // .populate('driver', 'name _id');   // _id bhi populate kar rahe hain
// //             .populate('driver', 'name _id profile rating');

// //         if (!ride) {
// //             console.log('❌ Ride not found');
// //             return next(createError.NotFound('Ride not found'));
// //         }

// //         // ✅ Fixed Comparison: Both sides ko string mein convert kar rahe hain
// //         const rideDriverId = ride.driver?._id ? ride.driver._id.toString() : ride.driver?.toString();

// //         console.log('Ride.driver ID (string):', rideDriverId);
// //         console.log('Request driverId (string):', driverId.toString());

// //         let etaText = "Arriving soon";

// //         if (ride.driver?.location && ride.pickupLocation?.coordinates) {

// //             const [driverLng, driverLat] = ride.driver.location.coordinates;
// //             const [pickupLng, pickupLat] = ride.pickupLocation.coordinates;

// //             const distanceKm = getDistanceInKm(driverLat, driverLng, pickupLat, pickupLng);

// //             // Assume avg speed = 30 km/h (city traffic)
// //             const timeMinutes = Math.ceil((distanceKm / 30) * 60);

// //             if (timeMinutes <= 1) {
// //                 etaText = "1 minute away";
// //             } else {
// //                 etaText = `${timeMinutes} minutes away`;
// //             }
// //         }

// //         const driverData = {
// //             driverId: ride.driver?._id,
// //             driverName: ride.driver?.name || '',

// //             // ✅ direct DB value (NO base URL)
// //             imageUrl: ride.driver?.profile || '',

// //             rating: ride.driver?.rating || 0,

// //             time: etaText   // 🔥 dynamic
// //         };

// //         if (rideDriverId !== driverId.toString()) {
// //             console.log('❌ Unauthorized: Driver is not assigned to this ride');
// //             return next(createError.Forbidden('You are not authorized for this ride'));
// //         }

// //         // Check current status
// //         if (!['start', 'Upcoming'].includes(ride.rideStatus)) {
// //             console.log('⚠️ Ride cannot be started from current status:', ride.rideStatus);
// //             return next(createError.BadRequest('Ride cannot be started at this stage. Current status: ' + ride.rideStatus));
// //         }

// //         console.log('✅ Starting journey...');

// //         // Update ride status
// //         ride.rideStatus = 'wayToPickup';
// //         ride.status = 'Ongoing';
// //         await ride.save();

// //         console.log('✅ Ride status updated to wayToPickup');

// //         // Notification for User
// //         const notificationData = {
// //             code: '1',
// //             title: 'Journey Started',
// //             body: 'Your journey has started. Driver is on the way to pickup.',
// //             rideId: ride._id.toString(),
// //             rideStatus: 'wayToPickup'
// //         };

// //         if (ride.user?.fcmToken) {
// //             // await sendRideNotification(ride.user.fcmToken, notificationData);
// //             // console.log('✅ FCM notification sent to user');

// //             await sendRideNotification(ride.user.fcmToken, {
// //                 title: 'Journey Started',
// //                 body: 'Your journey has started. Driver is on the way to pickup.',
// //                 rideId: ride._id.toString(),
// //                 rideStatus: 'wayToPickup',
// //                 user: ride.user._id,
// //                 driver: driverId,
// //             });
// //         }

// //         if (global.io) {
// //             global.io.to(ride.user._id.toString()).emit('rideStatusNotify', {
// //                 rideId: ride._id.toString(),
// //                 rideStatus: 'wayToPickup',
// //                 message: 'Your journey has started',
// //                 driver: driverData
// //             });
// //             console.log('✅ Socket notification sent to user');
// //         }

// //         if (global.io) {
// //             global.io.to(driverId.toString()).emit('journeyStarted', {
// //                 rideId: ride._id.toString(),
// //                 message: 'Journey started successfully'
// //             });
// //         }

// //         console.log('========== JOURNEY STARTED SUCCESSFULLY ==========\n');

// //         return res.json({
// //             code: '1',
// //             message: 'Journey started successfully',
// //             rideId: ride._id.toString(),
// //             rideStatus: 'wayToPickup',
// //             driver: driverData
// //         });

// //     } catch (error) {
// //         console.error('❌ startJourney Error:', error);
// //         next(error);
// //     }
// // };

// // ==================== START JOURNEY ====================
// // ==================== START JOURNEY ====================
// exports.startJourney = async (req, res, next) => {
//     try {
//         const { rideId } = req.body;

//         // Get driverId safely
//         let driverId = req.driver?._id || req.driver?.id;

//         if (!driverId && req.headers.authorization) {
//             try {
//                 const token = req.headers.authorization.split(' ')[1];
//                 const decoded = jwt.verify(token, process.env.JWT_SECRET);
//                 driverId = decoded._id;
//             } catch (e) {
//                 console.log('Token decode failed');
//             }
//         }

//         console.log('========== START JOURNEY API CALLED ==========');
//         console.log('Ride ID:', rideId);
//         console.log('Driver ID found:', driverId);

//         if (!rideId) {
//             return next(createError.BadRequest('rideId is required'));
//         }

//         if (!driverId) {
//             return next(createError.Unauthorized('Driver authentication failed. Please login again.'));
//         }

//         // Find the ride with populated driver + the vehicle TYPE the USER
//         // selected while booking (Ride.type) — Type is multilingual
//         // (en/fr/ar.name), so we populate it and resolve via multilingual().
//         const ride = await Ride.findById(rideId)
//             .populate('user', 'name phone fcmToken')
//             .populate('driver', 'name _id profile rating')
//             .populate('type', 'en fr ar typeFor');

//         if (!ride) {
//             console.log('❌ Ride not found');
//             return next(createError.NotFound('Ride not found'));
//         }

//         // ✅ Fixed Comparison: Both sides ko string mein convert kar rahe hain
//         const rideDriverId = ride.driver?._id ? ride.driver._id.toString() : ride.driver?.toString();

//         console.log('Ride.driver ID (string):', rideDriverId);
//         console.log('Request driverId (string):', driverId.toString());

//         let etaText = "Arriving soon";

//         if (ride.driver?.location && ride.pickupLocation?.coordinates) {

//             const [driverLng, driverLat] = ride.driver.location.coordinates;
//             const [pickupLng, pickupLat] = ride.pickupLocation.coordinates;

//             const distanceKm = getDistanceInKm(driverLat, driverLng, pickupLat, pickupLng);

//             const timeMinutes = Math.ceil((distanceKm / 30) * 60);

//             if (timeMinutes <= 1) {
//                 etaText = "1 minute away";
//             } else {
//                 etaText = `${timeMinutes} minutes away`;
//             }
//         }

//         // ✅ Dynamic carType — the vehicle type the USER selected while
//         // booking (ride.type), resolved via multilingual() using the
//         // Accept-Language header. NOT ride.driver.type (driver's own
//         // registered type — a different thing entirely).
//         const carTypeName = ride.type ? (multilingual(ride.type, req).name || '') : '';

//         const driverData = {
//             driverId: ride.driver?._id,
//             driverName: ride.driver?.name || '',
//             imageUrl: ride.driver?.profile || '',
//             rating: ride.driver?.rating || 0,
//             carType: carTypeName,   // ✅ user-selected type, dynamic
//             time: etaText
//         };

//         if (rideDriverId !== driverId.toString()) {
//             console.log('❌ Unauthorized: Driver is not assigned to this ride');
//             return next(createError.Forbidden('You are not authorized for this ride'));
//         }

//         // Check current status
//         if (!['start', 'Upcoming'].includes(ride.rideStatus)) {
//             console.log('⚠️ Ride cannot be started from current status:', ride.rideStatus);
//             return next(createError.BadRequest('Ride cannot be started at this stage. Current status: ' + ride.rideStatus));
//         }

//         console.log('✅ Starting journey...');

//         ride.rideStatus = 'wayToPickup';
//         ride.status = 'Ongoing';
//         await ride.save();

//         console.log('✅ Ride status updated to wayToPickup');

//         if (ride.user?.fcmToken) {
//             await sendRideNotification(ride.user.fcmToken, {
//                 title: 'Journey Started',
//                 body: 'Your journey has started. Driver is on the way to pickup.',
//                 rideId: ride._id.toString(),
//                 rideStatus: 'wayToPickup',
//                 user: ride.user._id,
//                 driver: driverId,
//             });
//         }

//         if (global.io) {
//             global.io.to(ride.user._id.toString()).emit('rideStatusNotify', {
//                 rideId: ride._id.toString(),
//                 rideStatus: 'wayToPickup',
//                 message: 'Your journey has started',
//                 driver: driverData
//             });
//             console.log('✅ Socket notification sent to user');
//         }

//         if (global.io) {
//             global.io.to(driverId.toString()).emit('journeyStarted', {
//                 rideId: ride._id.toString(),
//                 message: 'Journey started successfully'
//             });
//         }

//         console.log('========== JOURNEY STARTED SUCCESSFULLY ==========\n');

//         return res.json({
//             code: '1',
//             message: 'Journey started successfully',
//             rideId: ride._id.toString(),
//             rideStatus: 'wayToPickup',
//             driver: driverData
//         });

//     } catch (error) {
//         console.error('❌ startJourney Error:', error);
//         next(error);
//     }
// };

// // ---------------------------------------------------------------------
// // STEP 2 — NEW: helper + getFareDetails API
// // (kahin bhi rakh sakti ho, bas completeRide se UPAR rakhna)
// // ---------------------------------------------------------------------

// // Ride / RideReq ka fare breakup. Booking time par save hui values use hoti hain.
// // Agar purani ride me breakup save nahi hai to pickup/drop coordinates se
// // fare engine se dobara calculate hota hai. Last fallback: ride.price


// // GET /api/driver/fare-details            -> driver ki last completed ride ("Your last trip")
// // GET /api/driver/fare-details?rideId=ID  -> specific ride
// exports.getFareDetails = async (req, res, next) => {
//     try {
//         const rideId = req.query.rideId || req.body?.rideId;

//         let ride;
//         if (rideId) {
//             ride = await Ride.findOne({ _id: rideId, driver: req.driver.id });
//         } else {
//             ride = await Ride.findOne({
//                 driver: req.driver.id,
//                 status: 'Completed',
//             }).sort('-_id');
//         }

//         if (!ride) {
//             return next(
//                 createError.NotFound(rideId ? 'Ride not found.' : 'No completed trip found.')
//             );
//         }

//         const fareDetails = await getRideFareDetails(ride);

//         res.json({
//             code: '1',
//             message: req.t('success'),
//             data: { rideId: ride.id, ...fareDetails },
//         });
//     } catch (error) {
//         if (error.name === 'CastError')
//             return next(createError.BadRequest('Invalid rideId.'));
//         next(error);
//     }
// };

// // exports.completeRide = async (req, res, next) => {
// //     try {
// //         const { rideId } = req.body;
// //         const driverId = req.driver.id;
 
// //         console.log('========== COMPLETE RIDE API CALLED ==========');
// //         console.log('Ride ID:', rideId);
// //         console.log('Driver ID:', driverId);
 
// //         if (!rideId) {
// //             return next(createError.BadRequest('rideId is required'));
// //         }
 
// //         // 1. Find the ride
// //         const ride = await Ride.findById(rideId)
// //             .populate('user', 'name phone fcmToken')
// //             .populate({
// //                 path: 'driver',
// //                 select: 'name phone'
// //             });
 
// //         if (!ride) {
// //             console.log('❌ Ride not found');
// //             return next(createError.NotFound('Ride not found'));
// //         }
 
// //         // 2. Check if this driver is assigned to this ride
// //         if (ride.driver._id.toString() !== driverId.toString()) {
// //             console.log('❌ Unauthorized: Driver is not assigned to this ride');
// //             return next(createError.Forbidden('You are not authorized to complete this ride'));
// //         }
 
// //         // 3. Check current status
// //         if (ride.status === 'Completed') {
// //             console.log('⚠️ Ride is already completed');
// //             return res.json({
// //                 code: '0',
// //                 message: 'Ride is already completed'
// //             });
// //         }
 
// //         if (!['Ongoing', 'wayToPickup', 'tripStarted', 'start'].includes(ride.rideStatus)) {
// //             console.log('⚠️ Ride cannot be completed in current state:', ride.rideStatus);
// //             return next(createError.BadRequest('Ride cannot be completed at this stage'));
// //         }
 
// //         console.log('✅ Ride validation passed. Completing ride...');
 
// //         // 4. Update Ride
// //         ride.status = 'Completed';
// //         ride.rideStatus = 'wayToDone';
// //         ride.completedAt = new Date(); // rideModel.js me `completedAt: Date` field hona zaroori hai
 
// //         await ride.save();
 
// //         console.log('✅ Ride status updated to Completed');
 
// //         // ★★★ USER PROGRESS OFFERS + REWARD AUTO APPLY ★★★
// //         try {
// //             await updateOfferProgress(ride.user._id, ride);
// //             console.log('✅ Offer progress updated');
 
// //             // Target pura hua to reward user ke wallet me apne aap credit + history entry
// //             await autoApplyProgressRewards(ride.user._id);
// //             console.log('✅ Rewards auto applied');
// //         } catch (progressErr) {
// //             console.error('❌ offer progress / auto apply error (ride still completed):', progressErr);
// //             // error ignore karo taaki ride complete na ruke
// //         }
 
// //         // ★★★ DRIVER INCENTIVES & BONUS — milestone reach hua to driver wallet me reward ★★★
// //         try {
// //             await processRideCompletion(driverId, ride);
// //             console.log('✅ Driver incentives processed');
// //         } catch (incentiveErr) {
// //             console.error('❌ processRideCompletion error (ride still completed):', incentiveErr);
// //         }
 
// //         // ★★★ FARE DETAILS ("Your last trip" screen) ★★★
// //         let fareDetails;
// //         try {
// //             fareDetails = await getRideFareDetails(ride);
// //         } catch (fareErr) {
// //             console.error('❌ fare details error (ride still completed):', fareErr);
// //             fareDetails = {
// //                 tripType: null,
// //                 distanceKm: null,
// //                 baseFare: 0,
// //                 distanceCharge: 0,
// //                 platformFee: 0,
// //                 surgeCharge: 0,
// //                 total: Number(ride.price) || 0,
// //                 currency: '₹',
// //             };
// //         }
 
// //         // 5. Change Driver Status to Online
// //         await Driver.findByIdAndUpdate(driverId, {
// //             status: 'online'
// //         });
 
// //         console.log('✅ Driver status changed to online');
 
// //         // 6. Send Notification via FCM
// //         if (ride.user?.fcmToken) {
// //             await sendRideNotification(ride.user.fcmToken, {
// //                 title: 'Ride Completed',
// //                 body: `Your ride has been completed. Total fare: ₹${fareDetails.total}. Thank you for riding with us!`,
// //                 rideId: ride._id.toString(),
// //                 rideStatus: 'wayToDone',
// //                 status: 'Completed',
// //                 price: ride.price,
// //                 user: ride.user._id,
// //             });
// //             console.log('✅ FCM notification sent to user');
// //         } else {
// //             console.warn('⚠️ User FCM token not found');
// //         }
 
// //         // 7. Send Real-time Socket Notification to User (with fare details)
// //         if (global.io) {
// //             global.io.to(ride.user._id.toString()).emit('rideCompleted', {
// //                 rideId: ride._id.toString(),
// //                 status: 'Completed',
// //                 rideStatus: 'wayToDone',
// //                 message: 'Ride has been completed successfully',
// //                 price: ride.price,
// //                 fare: `₹${fareDetails.total}`,
// //                 fareDetails,
// //             });
// //             console.log('✅ Socket event rideCompleted sent to user');
// //         }
 
// //         // 8. Send Socket to Driver (confirmation with fare details)
// //         if (global.io) {
// //             global.io.to(driverId.toString()).emit('rideCompleteSuccess', {
// //                 rideId: ride._id.toString(),
// //                 message: 'Ride completed successfully',
// //                 price: ride.price,
// //                 fare: `₹${fareDetails.total}`,
// //                 fareDetails,
// //             });
// //         }
 
// //         console.log('========== RIDE COMPLETED SUCCESSFULLY ==========\n');
 
// //         // 9. Return response with fare details
// //         return res.json({
// //             code: '1',
// //             message: 'Ride completed successfully',
// //             rideId: ride._id.toString(),
// //             fare: {
// //                 price: ride.price,
// //                 currency: '₹',
// //                 message: `Total fare for this ride is ₹${fareDetails.total}`
// //             },
// //             fareDetails,
// //         });
 
// //     } catch (error) {
// //         console.error('❌ completeRide Error:', error);
// //         next(error);
// //     }
// // };
 

// exports.completeRide = async (req, res, next) => {
//     try {
//         const { rideId } = req.body;
//         const driverId = req.driver.id;
 
//         console.log('========== COMPLETE RIDE API CALLED ==========');
//         console.log('Ride ID:', rideId);
//         console.log('Driver ID:', driverId);
 
//         if (!rideId) {
//             return next(createError.BadRequest('rideId is required'));
//         }
 
//         // 1. Find the ride
//         const ride = await Ride.findById(rideId)
//             .populate('user', 'name phone fcmToken')
//             .populate({
//                 path: 'driver',
//                 select: 'name phone'
//             });
 
//         if (!ride) {
//             console.log('❌ Ride not found');
//             return next(createError.NotFound('Ride not found'));
//         }
 
//         // 2. Check if this driver is assigned to this ride
//         if (ride.driver._id.toString() !== driverId.toString()) {
//             console.log('❌ Unauthorized: Driver is not assigned to this ride');
//             return next(createError.Forbidden('You are not authorized to complete this ride'));
//         }
 
//         // 3. Check current status
//         if (ride.status === 'Completed') {
//             console.log('⚠️ Ride is already completed');
//             return res.json({
//                 code: '0',
//                 message: 'Ride is already completed'
//             });
//         }
 
//         if (!['Ongoing', 'wayToPickup', 'tripStarted', 'start'].includes(ride.rideStatus)) {
//             console.log('⚠️ Ride cannot be completed in current state:', ride.rideStatus);
//             return next(createError.BadRequest('Ride cannot be completed at this stage'));
//         }
 
//         console.log('✅ Ride validation passed. Completing ride...');
 
//         // 4. Update Ride
//         ride.status = 'Completed';
//         ride.rideStatus = 'wayToDone';
//         ride.completedAt = new Date(); // rideModel.js me `completedAt: Date` field hona zaroori hai
 
//         await ride.save();
 
//         console.log('✅ Ride status updated to Completed');
 
//         // ★★★ USER PROGRESS OFFERS + REWARD AUTO APPLY ★★★
//         try {
//             await updateOfferProgress(ride.user._id, ride);
//             console.log('✅ Offer progress updated');
 
//             // Target pura hua to reward user ke wallet me apne aap credit + history entry
//             await autoApplyProgressRewards(ride.user._id);
//             console.log('✅ Rewards auto applied');

//             // Referral code se aaye user ko pehli qualifying ride par discount (wallet credit)
//             const referral = await applyReferralReward(ride.user._id, ride);
//             if (referral) console.log('✅ Referral bonus credited:', referral.amount);
//         } catch (progressErr) {
//             console.error('❌ offer progress / auto apply error (ride still completed):', progressErr);
//             // error ignore karo taaki ride complete na ruke
//         }
 
//         // ★★★ DRIVER INCENTIVES & BONUS — milestone reach hua to driver wallet me reward ★★★
//         try {
//             await processRideCompletion(driverId, ride);
//             console.log('✅ Driver incentives processed');
//         } catch (incentiveErr) {
//             console.error('❌ processRideCompletion error (ride still completed):', incentiveErr);
//         }
 
//         // ★★★ FARE DETAILS ("Your last trip" screen) ★★★
//         let fareDetails;
//         try {
//             fareDetails = await getRideFareDetails(ride);
//         } catch (fareErr) {
//             console.error('❌ fare details error (ride still completed):', fareErr);
//             fareDetails = {
//                 tripType: null,
//                 distanceKm: null,
//                 baseFare: 0,
//                 distanceCharge: 0,
//                 platformFee: 0,
//                 surgeCharge: 0,
//                 total: Number(ride.price) || 0,
//                 currency: '₹',
//             };
//         }
 
//         // 5. Change Driver Status to Online
//         await Driver.findByIdAndUpdate(driverId, {
//             status: 'online'
//         });
 
//         console.log('✅ Driver status changed to online');
 
//         // 6. Send Notification via FCM
//         if (ride.user?.fcmToken) {
//             await sendRideNotification(ride.user.fcmToken, {
//                 title: 'Ride Completed',
//                 body: `Your ride has been completed. Total fare: ₹${fareDetails.total}. Thank you for riding with us!`,
//                 rideId: ride._id.toString(),
//                 rideStatus: 'wayToDone',
//                 status: 'Completed',
//                 price: ride.price,
//                 user: ride.user._id,
//             });
//             console.log('✅ FCM notification sent to user');
//         } else {
//             console.warn('⚠️ User FCM token not found');
//         }
 
//         // 7. Send Real-time Socket Notification to User (with fare details)
//         if (global.io) {
//             global.io.to(ride.user._id.toString()).emit('rideCompleted', {
//                 rideId: ride._id.toString(),
//                 status: 'Completed',
//                 rideStatus: 'wayToDone',
//                 message: 'Ride has been completed successfully',
//                 price: ride.price,
//                 fare: `₹${fareDetails.total}`,
//                 fareDetails,
//             });
//             console.log('✅ Socket event rideCompleted sent to user');
//         }
 
//         // 8. Send Socket to Driver (confirmation with fare details)
//         if (global.io) {
//             global.io.to(driverId.toString()).emit('rideCompleteSuccess', {
//                 rideId: ride._id.toString(),
//                 message: 'Ride completed successfully',
//                 price: ride.price,
//                 fare: `₹${fareDetails.total}`,
//                 fareDetails,
//             });
//         }
 
//         console.log('========== RIDE COMPLETED SUCCESSFULLY ==========\n');
 
//         // 9. Return response with fare details
//         return res.json({
//             code: '1',
//             message: 'Ride completed successfully',
//             rideId: ride._id.toString(),
//             fare: {
//                 price: ride.price,
//                 currency: '₹',
//                 message: `Total fare for this ride is ₹${fareDetails.total}`
//             },
//             fareDetails,
//         });
 
//     } catch (error) {
//         console.error('❌ completeRide Error:', error);
//         next(error);
//     }
// };
 

// const updateOfferProgress = async (userId, ride) => {
//     const now = new Date();

//     const progressOffers = await Offer.find({
//         offerType: 'progress',
//         isActive: true,
//         isDeleted: false,
//         validFrom: { $lte: now },
//         validTo: { $gte: now },
//     });

//     for (const offer of progressOffers) {
//         let progress = await UserOfferProgress.findOne({ userId, offerId: offer._id });

//         if (!progress) {
//             progress = new UserOfferProgress({ userId, offerId: offer._id });
//         }

//         if (progress.isCompleted) continue;

//         if (offer.progressType === 'rides_in_period') {
//             // getOffers mein real-time count hota hai, yahan kuch nahi karna
//         }
//         else if (offer.progressType === 'consecutive_days') {
//             const rideDate = new Date(ride.completedAt || ride.createdAt).setHours(0, 0, 0, 0);
//             const lastDate = progress.lastRideDate
//                 ? new Date(progress.lastRideDate).setHours(0, 0, 0, 0)
//                 : null;

//             if (!lastDate) {
//                 progress.consecutiveDays = 1;
//             } else {
//                 const diffDays = Math.round((rideDate - lastDate) / (1000 * 60 * 60 * 24));
//                 if (diffDays === 1) {
//                     progress.consecutiveDays += 1;
//                 } else if (diffDays > 1) {
//                     progress.consecutiveDays = 1; // streak toot gaya
//                 }
//                 // same day → kuch mat karo
//             }
//             progress.lastRideDate = ride.completedAt || ride.createdAt;
//         }
//         else if (offer.progressType === 'rides_in_time_window') {
//             const rideTimeObj = new Date(ride.completedAt || ride.createdAt);
//             const rideTime = rideTimeObj.getHours() * 60 + rideTimeObj.getMinutes();

//             const [sH, sM] = (offer.timeWindowStart || '00:00').split(':').map(Number);
//             const [eH, eM] = (offer.timeWindowEnd || '23:59').split(':').map(Number);
//             const startMin = sH * 60 + sM;
//             const endMin = eH * 60 + eM;

//             if (rideTime >= startMin && rideTime <= endMin) {
//                 progress.currentCount = (progress.currentCount || 0) + 1;
//             }
//         }

//         // Completion check
//         const current = offer.progressType === 'consecutive_days'
//             ? (progress.consecutiveDays || 0)
//             : (progress.currentCount || 0);

//         if (current >= offer.targetCount) {
//             progress.isCompleted = true;
//             progress.completedAt = now;

//             // TODO: yahan wallet credit karo
//             // await creditWallet(userId, offer.rewardValue, `Reward: ${offer.title}`);
//         }

//         await progress.save();
//     }
// };


const createError = require('http-errors');
const multilingual = require('../../utils/multilingual');
const { sendRideNotification } = require('../../utils/sendNotification');
const generateCode = require('../../utils/generateCode');

const Ride = require('../../models/rideModel');
const RideReq = require('../../models/rideReqModel');
const Driver = require('../../models/driverModel');
const User = require('../../models/userModel');
const Transaction = require("../../models/transaction")
const Offer = require('../../models/offerModel');
const UserOfferProgress = require('../../models/userOfferProgressModel');
const geolib = require('geolib');

const FareConfig = require('../../models/fareConfigModel');
const { calculateFare, getActiveFareConfig } = require('../../utils/fareEngine');
const { autoApplyProgressRewards } = require('../../utils/rewardAutoApply');
const { applyReferralReward } = require('../../utils/referralReward');
const { processRideCompletion } = require('../../utils/incentiveService');


// exports.getRides = async (req, res, next) => {
//     try {
//         const rides = await Ride.find({ driver: req.driver.id })
//             .populate('user', 'name profile phone')
//             .select('-driver -__v -otp')
//             .sort('-_id');

//         const updatedRides = await Promise.all(
//             rides.map(async (ride) => {

//                 const transaction = await Transaction.findOne({
//                     rideId: ride._id
//                 }).sort({ createdAt: -1 });

//                 return {
//                     ...ride.toObject(),

//                     driverId: req.driver.id,

//                     // ✅ payment
//                     paymentMethod: transaction?.source || transaction?.paymentMethod || transaction?.method || null,
//                     paymentStatus: transaction?.status || null,
//                     amount: transaction?.amount || null,

//                     // 🔥 ONLY upcoming rides ke liye
//                     scheduledTime: ride.status?.toLowerCase() === "upcoming"
//                         ? ride.scheduleTime
//                         : null
//                 };
//             })
//         );

//         res.json({
//             code: '1',
//             message: req.t('success'),
//             rides: updatedRides
//         });

//     } catch (error) {
//         next(error);
//     }
// };

// const getRideFareDetails = async (doc, fareConfig) => {
//     let baseFare = Number(doc.baseFare) || 0;
//     let distanceCharge = Number(doc.distanceCharge) || 0;
//     let platformFee = Number(doc.platformFee) || 0;
//     let surgeCharge = Number(doc.surgeCharge) || 0;
//     let total = Number(doc.estimatedTotal) || 0;
//     let tripType = doc.tripType || null;
//     let distanceKm = null;

//     const coords = [doc.pickupLat, doc.pickupLng, doc.endLat, doc.endLng].map(Number);
//     const hasCoords = coords.every((n) => Number.isFinite(n) && n !== 0);

//     if (hasCoords) {
//         distanceKm = Number(
//             (
//                 geolib.getDistance(
//                     { latitude: coords[0], longitude: coords[1] },
//                     { latitude: coords[2], longitude: coords[3] }
//                 ) / 1000
//             ).toFixed(2)
//         );
//     }

//     if (!total && hasCoords) {
//         const cfg = fareConfig || (await getActiveFareConfig(FareConfig));
//         const f = calculateFare({ distanceKm, fareConfig: cfg });
//         ({ baseFare, distanceCharge, platformFee, surgeCharge } = f);
//         total = f.estimatedTotal;
//         tripType = tripType || f.tripType;
//     }

//     if (!total) total = Number(doc.price) || 0;

//     return {
//         tripType,
//         distanceKm,
//         baseFare,
//         distanceCharge,
//         platformFee,
//         surgeCharge,
//         total,
//         currency: '₹',
//     };
// };

const getRideFareDetails = async (doc, fareConfig) => {
    let baseFare = Number(doc.baseFare) || 0;
    let distanceCharge = Number(doc.distanceCharge) || 0;
    let platformFee = Number(doc.platformFee) || 0;
    let surgeCharge = Number(doc.surgeCharge) || 0;
    let total = Number(doc.estimatedTotal) || 0;
    let tripType = doc.tripType || null;
    let distanceKm = null;
 
    const coords = [doc.pickupLat, doc.pickupLng, doc.endLat, doc.endLng].map(Number);
    const hasCoords = coords.every((n) => Number.isFinite(n) && n !== 0);
 
    if (hasCoords) {
        distanceKm = Number(
            (
                geolib.getDistance(
                    { latitude: coords[0], longitude: coords[1] },
                    { latitude: coords[2], longitude: coords[3] }
                ) / 1000
            ).toFixed(2)
        );
    }
 
    if (!total && hasCoords) {
        const cfg = fareConfig || (await getActiveFareConfig(FareConfig));
        const f = calculateFare({ distanceKm, fareConfig: cfg });
        ({ baseFare, distanceCharge, platformFee, surgeCharge } = f);
        total = f.estimatedTotal;
        tripType = tripType || f.tripType;
    }
 
    if (!total) total = Number(doc.price) || 0;
 
    return {
        tripType,
        distanceKm,
        baseFare,
        distanceCharge,
        platformFee,
        surgeCharge,
        total,
        currency: '₹',
    };
};

const ACT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ACT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Date -> { y, mo, d, h, mi, wd } (tz minutes ho to us timezone me, warna server local)
const actParts = (date, tz) => {
    if (tz !== null) {
        const x = new Date(date.getTime() + tz * 60000);
        return {
            y: x.getUTCFullYear(), mo: x.getUTCMonth(), d: x.getUTCDate(),
            h: x.getUTCHours(), mi: x.getUTCMinutes(), wd: x.getUTCDay(),
        };
    }
    return {
        y: date.getFullYear(), mo: date.getMonth(), d: date.getDate(),
        h: date.getHours(), mi: date.getMinutes(), wd: date.getDay(),
    };
};

const actPad = (n) => String(n).padStart(2, '0');
const actDateKey = (p) => `${p.y}-${actPad(p.mo + 1)}-${actPad(p.d)}`;

// 14:05 -> "2:05 pm"
const actTime = (p) => {
    const h12 = p.h % 12 === 0 ? 12 : p.h % 12;
    return `${h12}:${actPad(p.mi)} ${p.h >= 12 ? 'pm' : 'am'}`;
};

// "33 min 45 sec" / "1 hr 5 mins" / "00:45:10" / "45" (minutes) -> seconds
const actDurationSeconds = (value) => {
    if (value === undefined || value === null) return 0;
    const str = String(value).toLowerCase().trim();
    if (!str) return 0;

    const clock = str.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
    if (clock) {
        return clock[3] !== undefined
            ? Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3])
            : Number(clock[1]) * 60 + Number(clock[2]);
    }

    const h = str.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/);
    const m = str.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/);
    const s = str.match(/(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)\b/);
    if (h || m || s) {
        return Math.round(
            (h ? parseFloat(h[1]) * 3600 : 0) +
            (m ? parseFloat(m[1]) * 60 : 0) +
            (s ? parseFloat(s[1]) : 0)
        );
    }

    const plain = parseFloat(str); // sirf number -> minutes
    return Number.isFinite(plain) ? Math.round(plain * 60) : 0;
};

// 2025 -> "33 min 45 sec" (design jaisa), 1 ghante se zyada -> "1 hr 05 min"
const actFormatDuration = (sec) => {
    if (!sec) return null;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0 ? `${h} hr ${actPad(m)} min` : `${actPad(m)} min ${actPad(s)} sec`;
};

// "6.4 km" / "3 mi" / "850 m" / "6.4" -> km
const actDistanceKm = (value) => {
    if (value === undefined || value === null) return null;
    const str = String(value).toLowerCase().replace(/,/g, '');
    const num = parseFloat(str);
    if (!Number.isFinite(num)) return null;
    if (/\b(mi|mile|miles)\b/.test(str)) return num * 1.609344;
    if (/\d\s*m(?!i)\b/.test(str) && !/km/.test(str)) return num / 1000;
    return num;
};

const actCapitalize = (t) => (t ? String(t).charAt(0).toUpperCase() + String(t).slice(1) : null);

// ---------------------------------------------------------------------
// STEP 3 — UPDATED: getRides (purane ko isse replace karo)
// ---------------------------------------------------------------------
exports.getRides = async (req, res, next) => {
    try {
        const tzRaw = req.query.tzOffset;
        const tz =
            tzRaw !== undefined && tzRaw !== '' && Number.isFinite(Number(tzRaw))
                ? Number(tzRaw)
                : null;

        const rides = await Ride.find({ driver: req.driver.id })
            .populate('user', 'name profile phone')
            .select('-driver -__v -otp')
            .sort('-_id');

        // Saari rides ke transactions ek hi query me (N+1 se bachne ke liye)
        const transactions = await Transaction.find({
            rideId: { $in: rides.map((r) => r._id) },
        }).sort({ createdAt: -1 });

        const txByRide = {};
        transactions.forEach((t) => {
            const key = String(t.rideId);
            if (!txByRide[key]) txByRide[key] = t; // latest transaction
        });

        const fareConfig = await getActiveFareConfig(FareConfig);
        const todayKey = actDateKey(actParts(new Date(), tz));

        const items = [];

        for (const ride of rides) {
            const transaction = txByRide[String(ride._id)];
            const fare = await getRideFareDetails(ride, fareConfig);

            // Trip date: complete hui ho to completedAt, schedule ride ho to scheduleTime, warna createdAt
            const tripDate = new Date(
                ride.completedAt || (ride.isSchedule && ride.scheduleTime) || ride.createdAt || Date.now()
            );
            const p = actParts(tripDate, tz);
            const dateKey = actDateKey(p);

            const durationSeconds = actDurationSeconds(ride.time);
            const km = actDistanceKm(ride.distance);
            const distanceKm = km !== null ? Number(km.toFixed(1)) : fare.distanceKm;

            const paymentMethodRaw =
                transaction?.source || transaction?.paymentMethod || transaction?.method || ride.paymentMethod || null;

            const driverEarning =
                transaction && transaction.driverAmount
                    ? Number((transaction.driverAmount / 100).toFixed(2))
                    : null;

            // ✅ Activity card + Trip Details screen ka data
            const item = {
                rideId: ride.id,
                status: ride.status,
                rideStatus: ride.rideStatus,

                tripDate,
                date: dateKey,
                dateTitle: dateKey === todayKey
                    ? 'Today'
                    : `${ACT_DAYS[p.wd]}, ${ACT_MONTHS[p.mo]} ${p.d}`,
                tripTime: actTime(p), // "12:14 pm" (ride.time purana duration field alag rehta hai)

                total: fare.total,
                earn: fare.total,
                driverEarning,
                currency: fare.currency,

                duration: actFormatDuration(durationSeconds), // "33 min 45 sec"
                durationSeconds,
                distance: distanceKm !== null && distanceKm !== undefined ? `${distanceKm.toFixed(1)} km` : null, // "6.4 km"
                distanceKm,

                pickup: {
                    address: ride.pickupAddress,
                    latitude: Number(ride.pickupLat),
                    longitude: Number(ride.pickupLng),
                },
                drop: {
                    address: ride.endAddress,
                    latitude: Number(ride.endLat),
                    longitude: Number(ride.endLng),
                },

                user: ride.user
                    ? {
                        id: ride.user.id,
                        name: ride.user.name,
                        profile: ride.user.profile,
                        phone: ride.user.phone,
                    }
                    : null,

                paymentMethod: actCapitalize(paymentMethodRaw), // "Cash"
                paymentStatus: transaction?.status || null,

                // Fare Details
                baseFare: fare.baseFare,
                distanceCharge: fare.distanceCharge,
                platformFee: fare.platformFee,
                surgeCharge: fare.surgeCharge,
                tripType: fare.tripType,
                fareDetails: {
                    baseFare: fare.baseFare,
                    distanceCharge: fare.distanceCharge,
                    platformFee: fare.platformFee,
                    surgeCharge: fare.surgeCharge,
                    total: fare.total,
                },
            };

            items.push({ item, ride, transaction, tripDate });
        }

        // Naya trip upar (design jaisa)
        items.sort((a, b) => b.tripDate - a.tripDate);

        // ✅ Date-wise groups: Today, Tue Aug 9, ...
        const groups = [];
        const groupIndex = {};
        items.forEach(({ item }) => {
            if (groupIndex[item.date] === undefined) {
                groupIndex[item.date] = groups.length;
                groups.push({ date: item.date, title: item.dateTitle, rides: [] });
            }
            groups[groupIndex[item.date]].rides.push(item);
        });

        // ✅ Purani flat list (backward compatible) + naye fields
        const updatedRides = items.map(({ item, ride, transaction }) => ({
            ...ride.toObject(),
            ...item,

            driverId: req.driver.id,

            // purane fields jaise the
            paymentMethod: item.paymentMethod,
            paymentStatus: transaction?.status || null,
            amount: transaction?.amount || null,

            scheduledTime:
                ride.status?.toLowerCase() === 'upcoming' ? ride.scheduleTime : null,
        }));

        res.json({
            code: '1',
            message: req.t('success'),
            activity: groups,
            rides: updatedRides,
        });
    } catch (error) {
        next(error);
    }
};


exports.verifyRideOTP = async (req, res, next) => {
    try {
        const ride = await Ride.findById(req.body.rideId)
            .populate('user', 'name profile phone fcmToken')
            .select('-driver -__v')
            .sort('-_id');

        if (Number(req.body.otp) !== ride.otp)
            return next(createError.BadRequest('Invalid OTP.'));

        // Update ride status
        ride.rideStatus = 'start';
        await ride.save();

        // Notify user
        const notificationData = {
            code: '1',
            title: 'Ride Status',
            body: 'Your ride is on the way.',
            rideId: ride._id.toString(),
            rideStatus: ride.rideStatus,
        };

        await sendRideNotification(ride.user?.fcmToken, notificationData);

        io.to(ride.user.id).emit('rideStatusNotify', {
            rideId: ride.id,
            rideStatus: ride.rideStatus,
        });

        res.json({ code: '1', message: req.t('success'), ride });
    } catch (error) {
        next(error);
    }
};

exports.driverResponse = async (req, res, next) => {
    try {
        const { driverId, rideId, response, time, distance, userId } = req.body;
        const isSchedule = req.body.isSchedule === 'true';

        if (!driverId || !rideId || !response)
            return next(createError.BadRequest('Invalid request data.'));

        const driver = await Driver.findById(driverId);
        if (!driver) return next(createError.BadRequest('Driver not found.'));

        const ride = await RideReq.findById(rideId);
        if (!ride) return next(createError.BadRequest('Ride not found.'));

        const isScheduledRide = isSchedule || !!ride.scheduleTime || !!ride.scheduledDate || !!ride.isSchedule;

        // if (response === 'accept') {
        //     // if (ride.acceptedBy) {
        //     //     // Ride has already been accepted by another driver
        //     //     return res.json({
        //     //         code: '0',
        //     //         message: req.t('ride.already'),
        //     //     });
        //     // }
        //     // ride.acceptedBy = driverId;
        //     // await ride.save();

        //     // await Driver.findByIdAndUpdate(driver.id, {
        //     //     isHandlingRequest: true,
        //     // });

        //     let rideResponse = await Ride.create({
        //         ...ride._doc,
        //         driver: driverId,
        //         time,
        //         distance,
        //         otp: generateCode(6),
        //         // status: isSchedule ? 'Upcoming' : 'Ongoing',
        //         status: 'Upcoming',
        //         rideStatus: 'start',
        //     });

        //     if (!isSchedule)
        //         await Driver.findByIdAndUpdate(driverId, { status: 'busy' });

        //     await rideResponse.populate({
        //         path: 'driver',
        //         populate: {
        //             path: 'type',
        //             select: '-__v -distanceRate -typeFor -capacity',
        //         },
        //         select: 'name profile phone',
        //     });
        //     await rideResponse.populate({
        //         path: 'user',
        //         select: 'name phone',
        //     });

        //     rideResponse = rideResponse._doc;
        //     rideResponse.type = multilingual(rideResponse.driver.type, req);
        //     rideResponse.driver.type = undefined;
        //     rideResponse.__v = undefined;

        //     const user = await User.findById(userId);

        //     const notificationData = {
        //         code: '1',
        //         message: req.t('success'),
        //         title: 'Ride Accepted',
        //         // body: req.t(isSchedule ? 'ride.schedule' : 'ride.success'),
        //         body: 'Your ride has been successfully booked.',
        //         ride: rideResponse,
        //     };
        //     await sendRideNotification(user.fcmToken, notificationData);

        //     return res.json({
        //         code: '1',
        //         message: req.t('success'),
        //         distance: distance,
        //         time: time,
        //     });
        // } 
        if (response === 'accept') {

            let rideResponse = await Ride.create({
                ...ride._doc,
                driver: driverId,                    // ← Yeh line sahi hai
                time,
                distance,
                otp: generateCode(6),
                status: 'Upcoming',                  // ← Aap chahte the Upcoming
                rideStatus: 'start',                 // ← Yeh zaroori hai
                isSchedule: isScheduledRide,
            });

            if (!isSchedule)
                await Driver.findByIdAndUpdate(driverId, { status: 'busy' });

            await rideResponse.populate({
                path: 'driver',
                populate: {
                    path: 'type',
                    select: '-__v -distanceRate -typeFor -capacity',
                },
                select: 'name profile phone',
            });

            await rideResponse.populate({
                path: 'user',
                select: 'name phone',
            });

            rideResponse = rideResponse._doc;
            rideResponse.type = multilingual(rideResponse.driver.type, req);
            rideResponse.driver.type = undefined;
            rideResponse.__v = undefined;

            const user = await User.findById(userId);

            const notificationData = {
                code: '1',
                message: req.t('success'),
                title: 'Ride Accepted',
                body: 'Your ride has been successfully booked.',
                ride: rideResponse,
                user: userId,
            };
            await sendRideNotification(user.fcmToken, notificationData);



            return res.json({
                code: '1',
                message: req.t('success'),
                distance: distance,
                time: time,
            });
        }

        // else if (response === 'reject') {
        //     const notificationData = {
        //         code: '0',
        //         title: 'Ride Fail',
        //         body: req.t('ride.fail'),
        //     };
        //     await sendRideNotification(userId.fcmToken, notificationData);

        //     return res.json({ code: '0', message: req.t('ride.rejected') });
        // } 

        else if (response === 'reject') {

            const user = await User.findById(userId);

            if (!user || !user.fcmToken) {
                return res.json({
                    code: '0',
                    message: 'User or FCM token not found'
                });
            }

            const notificationData = {
                code: '0',
                title: 'Ride Rejected',
                body: req.t('ride.fail'),
                user: userId,
            };

            await sendRideNotification(user.fcmToken, notificationData); // ✅ FIX

            return res.json({ code: '0', message: req.t('ride.rejected') });
        }


        else {
            return res.json({ code: '0', message: 'Invalid response.' });
        }
    } catch (error) {
        next(error);
    }
};

// ==================== START JOURNEY ====================
// exports.startJourney = async (req, res, next) => {
//     try {
//         const { rideId } = req.body;

//         // Get driverId safely
//         let driverId = req.driver?._id || req.driver?.id;

//         if (!driverId && req.headers.authorization) {
//             try {
//                 const token = req.headers.authorization.split(' ')[1];
//                 const decoded = jwt.verify(token, process.env.JWT_SECRET);
//                 driverId = decoded._id;
//             } catch (e) {
//                 console.log('Token decode failed');
//             }
//         }

//         console.log('========== START JOURNEY API CALLED ==========');
//         console.log('Ride ID:', rideId);
//         console.log('Driver ID found:', driverId);

//         if (!rideId) {
//             return next(createError.BadRequest('rideId is required'));
//         }

//         if (!driverId) {
//             return next(createError.Unauthorized('Driver authentication failed. Please login again.'));
//         }

//         // Find the ride with populated driver
//         const ride = await Ride.findById(rideId)
//             .populate('user', 'name phone fcmToken')
//             // .populate('driver', 'name _id');   // _id bhi populate kar rahe hain
//             .populate('driver', 'name _id profile rating');

//         if (!ride) {
//             console.log('❌ Ride not found');
//             return next(createError.NotFound('Ride not found'));
//         }

//         // ✅ Fixed Comparison: Both sides ko string mein convert kar rahe hain
//         const rideDriverId = ride.driver?._id ? ride.driver._id.toString() : ride.driver?.toString();

//         console.log('Ride.driver ID (string):', rideDriverId);
//         console.log('Request driverId (string):', driverId.toString());

//         let etaText = "Arriving soon";

//         if (ride.driver?.location && ride.pickupLocation?.coordinates) {

//             const [driverLng, driverLat] = ride.driver.location.coordinates;
//             const [pickupLng, pickupLat] = ride.pickupLocation.coordinates;

//             const distanceKm = getDistanceInKm(driverLat, driverLng, pickupLat, pickupLng);

//             // Assume avg speed = 30 km/h (city traffic)
//             const timeMinutes = Math.ceil((distanceKm / 30) * 60);

//             if (timeMinutes <= 1) {
//                 etaText = "1 minute away";
//             } else {
//                 etaText = `${timeMinutes} minutes away`;
//             }
//         }

//         const driverData = {
//             driverId: ride.driver?._id,
//             driverName: ride.driver?.name || '',

//             // ✅ direct DB value (NO base URL)
//             imageUrl: ride.driver?.profile || '',

//             rating: ride.driver?.rating || 0,

//             time: etaText   // 🔥 dynamic
//         };

//         if (rideDriverId !== driverId.toString()) {
//             console.log('❌ Unauthorized: Driver is not assigned to this ride');
//             return next(createError.Forbidden('You are not authorized for this ride'));
//         }

//         // Check current status
//         if (!['start', 'Upcoming'].includes(ride.rideStatus)) {
//             console.log('⚠️ Ride cannot be started from current status:', ride.rideStatus);
//             return next(createError.BadRequest('Ride cannot be started at this stage. Current status: ' + ride.rideStatus));
//         }

//         console.log('✅ Starting journey...');

//         // Update ride status
//         ride.rideStatus = 'wayToPickup';
//         ride.status = 'Ongoing';
//         await ride.save();

//         console.log('✅ Ride status updated to wayToPickup');

//         // Notification for User
//         const notificationData = {
//             code: '1',
//             title: 'Journey Started',
//             body: 'Your journey has started. Driver is on the way to pickup.',
//             rideId: ride._id.toString(),
//             rideStatus: 'wayToPickup'
//         };

//         if (ride.user?.fcmToken) {
//             // await sendRideNotification(ride.user.fcmToken, notificationData);
//             // console.log('✅ FCM notification sent to user');

//             await sendRideNotification(ride.user.fcmToken, {
//                 title: 'Journey Started',
//                 body: 'Your journey has started. Driver is on the way to pickup.',
//                 rideId: ride._id.toString(),
//                 rideStatus: 'wayToPickup',
//                 user: ride.user._id,
//                 driver: driverId,
//             });
//         }

//         if (global.io) {
//             global.io.to(ride.user._id.toString()).emit('rideStatusNotify', {
//                 rideId: ride._id.toString(),
//                 rideStatus: 'wayToPickup',
//                 message: 'Your journey has started',
//                 driver: driverData
//             });
//             console.log('✅ Socket notification sent to user');
//         }

//         if (global.io) {
//             global.io.to(driverId.toString()).emit('journeyStarted', {
//                 rideId: ride._id.toString(),
//                 message: 'Journey started successfully'
//             });
//         }

//         console.log('========== JOURNEY STARTED SUCCESSFULLY ==========\n');

//         return res.json({
//             code: '1',
//             message: 'Journey started successfully',
//             rideId: ride._id.toString(),
//             rideStatus: 'wayToPickup',
//             driver: driverData
//         });

//     } catch (error) {
//         console.error('❌ startJourney Error:', error);
//         next(error);
//     }
// };

// ==================== START JOURNEY ====================
// ==================== START JOURNEY ====================
exports.startJourney = async (req, res, next) => {
    try {
        const { rideId } = req.body;

        // Get driverId safely
        let driverId = req.driver?._id || req.driver?.id;

        if (!driverId && req.headers.authorization) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                driverId = decoded._id;
            } catch (e) {
                console.log('Token decode failed');
            }
        }

        console.log('========== START JOURNEY API CALLED ==========');
        console.log('Ride ID:', rideId);
        console.log('Driver ID found:', driverId);

        if (!rideId) {
            return next(createError.BadRequest('rideId is required'));
        }

        if (!driverId) {
            return next(createError.Unauthorized('Driver authentication failed. Please login again.'));
        }

        // Find the ride with populated driver + the vehicle TYPE the USER
        // selected while booking (Ride.type) — Type is multilingual
        // (en/fr/ar.name), so we populate it and resolve via multilingual().
        const ride = await Ride.findById(rideId)
            .populate('user', 'name phone fcmToken')
            .populate('driver', 'name _id profile rating')
            .populate('type', 'en fr ar typeFor');

        if (!ride) {
            console.log('❌ Ride not found');
            return next(createError.NotFound('Ride not found'));
        }

        // ✅ Fixed Comparison: Both sides ko string mein convert kar rahe hain
        const rideDriverId = ride.driver?._id ? ride.driver._id.toString() : ride.driver?.toString();

        console.log('Ride.driver ID (string):', rideDriverId);
        console.log('Request driverId (string):', driverId.toString());

        let etaText = "Arriving soon";

        if (ride.driver?.location && ride.pickupLocation?.coordinates) {

            const [driverLng, driverLat] = ride.driver.location.coordinates;
            const [pickupLng, pickupLat] = ride.pickupLocation.coordinates;

            const distanceKm = getDistanceInKm(driverLat, driverLng, pickupLat, pickupLng);

            const timeMinutes = Math.ceil((distanceKm / 30) * 60);

            if (timeMinutes <= 1) {
                etaText = "1 minute away";
            } else {
                etaText = `${timeMinutes} minutes away`;
            }
        }

        // ✅ Dynamic carType — the vehicle type the USER selected while
        // booking (ride.type), resolved via multilingual() using the
        // Accept-Language header. NOT ride.driver.type (driver's own
        // registered type — a different thing entirely).
        const carTypeName = ride.type ? (multilingual(ride.type, req).name || '') : '';

        const driverData = {
            driverId: ride.driver?._id,
            driverName: ride.driver?.name || '',
            imageUrl: ride.driver?.profile || '',
            rating: ride.driver?.rating || 0,
            carType: carTypeName,   // ✅ user-selected type, dynamic
            time: etaText
        };

        if (rideDriverId !== driverId.toString()) {
            console.log('❌ Unauthorized: Driver is not assigned to this ride');
            return next(createError.Forbidden('You are not authorized for this ride'));
        }

        // Check current status
        if (!['start', 'Upcoming'].includes(ride.rideStatus)) {
            console.log('⚠️ Ride cannot be started from current status:', ride.rideStatus);
            return next(createError.BadRequest('Ride cannot be started at this stage. Current status: ' + ride.rideStatus));
        }

        console.log('✅ Starting journey...');

        ride.rideStatus = 'wayToPickup';
        ride.status = 'Ongoing';
        await ride.save();

        console.log('✅ Ride status updated to wayToPickup');

        if (ride.user?.fcmToken) {
            await sendRideNotification(ride.user.fcmToken, {
                title: 'Journey Started',
                body: 'Your journey has started. Driver is on the way to pickup.',
                rideId: ride._id.toString(),
                rideStatus: 'wayToPickup',
                user: ride.user._id,
                driver: driverId,
            });
        }

        if (global.io) {
            global.io.to(ride.user._id.toString()).emit('rideStatusNotify', {
                rideId: ride._id.toString(),
                rideStatus: 'wayToPickup',
                message: 'Your journey has started',
                driver: driverData
            });
            console.log('✅ Socket notification sent to user');
        }

        if (global.io) {
            global.io.to(driverId.toString()).emit('journeyStarted', {
                rideId: ride._id.toString(),
                message: 'Journey started successfully'
            });
        }

        console.log('========== JOURNEY STARTED SUCCESSFULLY ==========\n');

        return res.json({
            code: '1',
            message: 'Journey started successfully',
            rideId: ride._id.toString(),
            rideStatus: 'wayToPickup',
            driver: driverData
        });

    } catch (error) {
        console.error('❌ startJourney Error:', error);
        next(error);
    }
};

// ---------------------------------------------------------------------
// STEP 2 — NEW: helper + getFareDetails API
// (kahin bhi rakh sakti ho, bas completeRide se UPAR rakhna)
// ---------------------------------------------------------------------

// Ride / RideReq ka fare breakup. Booking time par save hui values use hoti hain.
// Agar purani ride me breakup save nahi hai to pickup/drop coordinates se
// fare engine se dobara calculate hota hai. Last fallback: ride.price


// GET /api/driver/fare-details            -> driver ki last completed ride ("Your last trip")
// GET /api/driver/fare-details?rideId=ID  -> specific ride
exports.getFareDetails = async (req, res, next) => {
    try {
        const rideId = req.query.rideId || req.body?.rideId;

        let ride;
        if (rideId) {
            ride = await Ride.findOne({ _id: rideId, driver: req.driver.id });
        } else {
            ride = await Ride.findOne({
                driver: req.driver.id,
                status: 'Completed',
            }).sort('-_id');
        }

        if (!ride) {
            return next(
                createError.NotFound(rideId ? 'Ride not found.' : 'No completed trip found.')
            );
        }

        const fareDetails = await getRideFareDetails(ride);

        res.json({
            code: '1',
            message: req.t('success'),
            data: { rideId: ride.id, ...fareDetails },
        });
    } catch (error) {
        if (error.name === 'CastError')
            return next(createError.BadRequest('Invalid rideId.'));
        next(error);
    }
};

// exports.completeRide = async (req, res, next) => {
//     try {
//         const { rideId } = req.body;
//         const driverId = req.driver.id;

//         console.log('========== COMPLETE RIDE API CALLED ==========');
//         console.log('Ride ID:', rideId);
//         console.log('Driver ID:', driverId);

//         if (!rideId) {
//             return next(createError.BadRequest('rideId is required'));
//         }

//         // 1. Find the ride
//         const ride = await Ride.findById(rideId)
//             .populate('user', 'name phone fcmToken')
//             .populate({
//                 path: 'driver',
//                 select: 'name phone'
//             });

//         if (!ride) {
//             console.log('❌ Ride not found');
//             return next(createError.NotFound('Ride not found'));
//         }

//         // 2. Check if this driver is assigned to this ride
//         if (ride.driver._id.toString() !== driverId.toString()) {
//             console.log('❌ Unauthorized: Driver is not assigned to this ride');
//             return next(createError.Forbidden('You are not authorized to complete this ride'));
//         }

//         // 3. Check current status
//         if (ride.status === 'Completed') {
//             console.log('⚠️ Ride is already completed');
//             return res.json({
//                 code: '0',
//                 message: 'Ride is already completed'
//             });
//         }

//         if (!['Ongoing', 'wayToPickup', 'tripStarted', 'start'].includes(ride.rideStatus)) {
//             console.log('⚠️ Ride cannot be completed in current state:', ride.rideStatus);
//             return next(createError.BadRequest('Ride cannot be completed at this stage'));
//         }

//         console.log('✅ Ride validation passed. Completing ride...');

//         // 4. Update Ride
//         ride.status = 'Completed';
//         ride.rideStatus = 'wayToDone';
//         ride.completedAt = new Date();

//         await ride.save();

//         console.log('✅ Ride status updated to Completed');

//         // ★★★ PROGRESS OFFERS UPDATE ★★★
//         try {
//             await updateOfferProgress(ride.user._id, ride);
//             console.log('✅ Offer progress updated');
//         } catch (progressErr) {
//             console.error('❌ updateOfferProgress error (ride still completed):', progressErr);
//             // error ignore karo taaki ride complete na ruke
//         }

//         // ★★★ DRIVER INCENTIVES — milestone reach hua to wallet me reward credit ★★★   👈 YAHAN PASTE
//         try {
//             await processRideCompletion(driverId, ride);
//             console.log('✅ Driver incentives processed');
//         } catch (incentiveErr) {
//             console.error('❌ processRideCompletion error (ride still completed):', incentiveErr);
//         }

//         await Driver.findByIdAndUpdate(driverId, { status: 'online' });

//         // ★★★ FARE DETAILS ("Your last trip" screen) ★★★
//         let fareDetails;
//         try {
//             fareDetails = await getRideFareDetails(ride);
//         } catch (fareErr) {
//             console.error('❌ fare details error (ride still completed):', fareErr);
//             fareDetails = {
//                 tripType: null,
//                 distanceKm: null,
//                 baseFare: 0,
//                 distanceCharge: 0,
//                 platformFee: 0,
//                 surgeCharge: 0,
//                 total: Number(ride.price) || 0,
//                 currency: '$',
//             };
//         }

//         // 5. Change Driver Status to Online
//         await Driver.findByIdAndUpdate(driverId, {
//             status: 'online'
//         });

//         console.log('✅ Driver status changed to online');

//         // 6. Send Notification via FCM
//         if (ride.user?.fcmToken) {
//             await sendRideNotification(ride.user.fcmToken, {
//                 title: 'Ride Completed',
//                 body: `Your ride has been completed. Total fare: $${fareDetails.total}. Thank you for riding with us!`,
//                 rideId: ride._id.toString(),
//                 rideStatus: 'wayToDone',
//                 status: 'Completed',
//                 price: ride.price,
//                 user: ride.user._id,
//             });
//             console.log('✅ FCM notification sent to user');
//         } else {
//             console.warn('⚠️ User FCM token not found');
//         }

//         // 7. Send Real-time Socket Notification to User (with fare details)
//         if (global.io) {
//             global.io.to(ride.user._id.toString()).emit('rideCompleted', {
//                 rideId: ride._id.toString(),
//                 status: 'Completed',
//                 rideStatus: 'wayToDone',
//                 message: 'Ride has been completed successfully',
//                 price: ride.price,
//                 fare: `$${fareDetails.total}`,
//                 fareDetails,
//             });
//             console.log('✅ Socket event rideCompleted sent to user');
//         }

//         // 8. Send Socket to Driver (confirmation with fare details)
//         if (global.io) {
//             global.io.to(driverId.toString()).emit('rideCompleteSuccess', {
//                 rideId: ride._id.toString(),
//                 message: 'Ride completed successfully',
//                 price: ride.price,
//                 fare: `$${fareDetails.total}`,
//                 fareDetails,
//             });
//         }

//         console.log('========== RIDE COMPLETED SUCCESSFULLY ==========\n');

//         // 9. Return response with fare details
//         return res.json({
//             code: '1',
//             message: 'Ride completed successfully',
//             rideId: ride._id.toString(),
//             fare: {
//                 price: ride.price,
//                 currency: '$',
//                 message: `Total fare for this ride is $${fareDetails.total}`
//             },
//             fareDetails,
//         });

//     } catch (error) {
//         console.error('❌ completeRide Error:', error);
//         next(error);
//     }
// };

exports.completeRide = async (req, res, next) => {
    try {
        const { rideId } = req.body;
        const driverId = req.driver.id;
 
        console.log('========== COMPLETE RIDE API CALLED ==========');
        console.log('Ride ID:', rideId);
        console.log('Driver ID:', driverId);
 
        if (!rideId) {
            return next(createError.BadRequest('rideId is required'));
        }
 
        // 1. Find the ride
        const ride = await Ride.findById(rideId)
            .populate('user', 'name phone fcmToken')
            .populate({
                path: 'driver',
                select: 'name phone'
            });
 
        if (!ride) {
            console.log('❌ Ride not found');
            return next(createError.NotFound('Ride not found'));
        }
 
        // 2. Check if this driver is assigned to this ride
        if (ride.driver._id.toString() !== driverId.toString()) {
            console.log('❌ Unauthorized: Driver is not assigned to this ride');
            return next(createError.Forbidden('You are not authorized to complete this ride'));
        }
 
        // 3. Check current status
        if (ride.status === 'Completed') {
            console.log('⚠️ Ride is already completed');
            return res.json({
                code: '0',
                message: 'Ride is already completed'
            });
        }
 
        if (!['Ongoing', 'wayToPickup', 'tripStarted', 'start'].includes(ride.rideStatus)) {
            console.log('⚠️ Ride cannot be completed in current state:', ride.rideStatus);
            return next(createError.BadRequest('Ride cannot be completed at this stage'));
        }
 
        console.log('✅ Ride validation passed. Completing ride...');
 
        // 4. Update Ride
        ride.status = 'Completed';
        ride.rideStatus = 'wayToDone';
        ride.completedAt = new Date(); // rideModel.js me `completedAt: Date` field hona zaroori hai
 
        await ride.save();
 
        console.log('✅ Ride status updated to Completed');
 
        // ★★★ USER PROGRESS OFFERS + REWARD AUTO APPLY ★★★
        try {
            await updateOfferProgress(ride.user._id, ride);
            console.log('✅ Offer progress updated');
 
            // Target pura hua to reward user ke wallet me apne aap credit + history entry
            await autoApplyProgressRewards(ride.user._id);
            console.log('✅ Rewards auto applied');
        } catch (progressErr) {
            console.error('❌ offer progress / auto apply error (ride still completed):', progressErr);
            // error ignore karo taaki ride complete na ruke
        }

        // ★★★ REFERRAL BONUS — alag try me, taaki upar ke offer logic ka error isse na roke ★★★
        try {
            const referral = await applyReferralReward(ride.user._id, ride);
            if (referral) {
                console.log(`✅ Referral bonus credited to referrer: $${referral.amount}`);
            }
        } catch (referralErr) {
            console.error('❌ referral bonus error (ride still completed):', referralErr);
        }
 
        // ★★★ DRIVER INCENTIVES & BONUS — milestone reach hua to driver wallet me reward ★★★
        try {
            await processRideCompletion(driverId, ride);
            console.log('✅ Driver incentives processed');
        } catch (incentiveErr) {
            console.error('❌ processRideCompletion error (ride still completed):', incentiveErr);
        }
 
        // ★★★ FARE DETAILS ("Your last trip" screen) ★★★
        let fareDetails;
        try {
            fareDetails = await getRideFareDetails(ride);
        } catch (fareErr) {
            console.error('❌ fare details error (ride still completed):', fareErr);
            fareDetails = {
                tripType: null,
                distanceKm: null,
                baseFare: 0,
                distanceCharge: 0,
                platformFee: 0,
                surgeCharge: 0,
                total: Number(ride.price) || 0,
                currency: '₹',
            };
        }
 
        // 5. Change Driver Status to Online
        await Driver.findByIdAndUpdate(driverId, {
            status: 'online'
        });
 
        console.log('✅ Driver status changed to online');
 
        // 6. Send Notification via FCM
        if (ride.user?.fcmToken) {
            await sendRideNotification(ride.user.fcmToken, {
                title: 'Ride Completed',
                body: `Your ride has been completed. Total fare: ₹${fareDetails.total}. Thank you for riding with us!`,
                rideId: ride._id.toString(),
                rideStatus: 'wayToDone',
                status: 'Completed',
                price: ride.price,
                user: ride.user._id,
            });
            console.log('✅ FCM notification sent to user');
        } else {
            console.warn('⚠️ User FCM token not found');
        }
 
        // 7. Send Real-time Socket Notification to User (with fare details)
        if (global.io) {
            global.io.to(ride.user._id.toString()).emit('rideCompleted', {
                rideId: ride._id.toString(),
                status: 'Completed',
                rideStatus: 'wayToDone',
                message: 'Ride has been completed successfully',
                price: ride.price,
                fare: `₹${fareDetails.total}`,
                fareDetails,
            });
            console.log('✅ Socket event rideCompleted sent to user');
        }
 
        // 8. Send Socket to Driver (confirmation with fare details)
        if (global.io) {
            global.io.to(driverId.toString()).emit('rideCompleteSuccess', {
                rideId: ride._id.toString(),
                message: 'Ride completed successfully',
                price: ride.price,
                fare: `₹${fareDetails.total}`,
                fareDetails,
            });
        }
 
        console.log('========== RIDE COMPLETED SUCCESSFULLY ==========\n');
 
        // 9. Return response with fare details
        return res.json({
            code: '1',
            message: 'Ride completed successfully',
            rideId: ride._id.toString(),
            fare: {
                price: ride.price,
                currency: '₹',
                message: `Total fare for this ride is ₹${fareDetails.total}`
            },
            fareDetails,
        });
 
    } catch (error) {
        console.error('❌ completeRide Error:', error);
        next(error);
    }
};
 

const updateOfferProgress = async (userId, ride) => {
    const now = new Date();

    const progressOffers = await Offer.find({
        offerType: 'progress',
        isActive: true,
        isDeleted: false,
        validFrom: { $lte: now },
        validTo: { $gte: now },
    });

    for (const offer of progressOffers) {
        let progress = await UserOfferProgress.findOne({ userId, offerId: offer._id });

        if (!progress) {
            progress = new UserOfferProgress({ userId, offerId: offer._id });
        }

        if (progress.isCompleted) continue;

        if (offer.progressType === 'rides_in_period') {
            // getOffers mein real-time count hota hai, yahan kuch nahi karna
        }
        else if (offer.progressType === 'consecutive_days') {
            const rideDate = new Date(ride.completedAt || ride.createdAt).setHours(0, 0, 0, 0);
            const lastDate = progress.lastRideDate
                ? new Date(progress.lastRideDate).setHours(0, 0, 0, 0)
                : null;

            if (!lastDate) {
                progress.consecutiveDays = 1;
            } else {
                const diffDays = Math.round((rideDate - lastDate) / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    progress.consecutiveDays += 1;
                } else if (diffDays > 1) {
                    progress.consecutiveDays = 1; // streak toot gaya
                }
                // same day → kuch mat karo
            }
            progress.lastRideDate = ride.completedAt || ride.createdAt;
        }
        else if (offer.progressType === 'rides_in_time_window') {
            const rideTimeObj = new Date(ride.completedAt || ride.createdAt);
            const rideTime = rideTimeObj.getHours() * 60 + rideTimeObj.getMinutes();

            const [sH, sM] = (offer.timeWindowStart || '00:00').split(':').map(Number);
            const [eH, eM] = (offer.timeWindowEnd || '23:59').split(':').map(Number);
            const startMin = sH * 60 + sM;
            const endMin = eH * 60 + eM;

            if (rideTime >= startMin && rideTime <= endMin) {
                progress.currentCount = (progress.currentCount || 0) + 1;
            }
        }

        // Completion check
        const current = offer.progressType === 'consecutive_days'
            ? (progress.consecutiveDays || 0)
            : (progress.currentCount || 0);

        if (current >= offer.targetCount) {
            progress.isCompleted = true;
            progress.completedAt = now;

            // TODO: yahan wallet credit karo
            // await creditWallet(userId, offer.rewardValue, `Reward: ${offer.title}`);
        }

        await progress.save();
    }
};