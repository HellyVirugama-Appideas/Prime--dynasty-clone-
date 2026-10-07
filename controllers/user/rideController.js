const geolib = require('geolib');
const createError = require('http-errors');
const { sendOnlyNotification } = require('../../utils/sendNotification');
const multilingual = require('../../utils/multilingual');
const notifyDriversFirebase = require('../../utils/notifyDriversFirebase');
const notifyDrivers = require('../../utils/notifyDrivers');
const generateCode = require('../../utils/generateCode');

const Type = require('../../models/typeModel');
const Charges = require('../../models/chargesModel');
const FareConfig = require('../../models/fareConfigModel');
const RideReq = require('../../models/rideReqModel');
const Ride = require('../../models/rideModel');
const Driver = require('../../models/driverModel');
const Rating = require('../../models/driverRatingModel');
const Transaction = require("../../models/transaction")
const { calculateFare, getActiveFareConfig } = require('../../utils/fareEngine');
const UserOfferProgress = require('../../models/userOfferProgressModel');
const CancelReason = require('../../models/cancelReasonModel'); 


// ✅ Single getVehicleTypes — useFor based matching
exports.getVehicleTypes = async (req, res, next) => {
    try {
        const { type, pickupLat, pickupLng, endLat, endLng } = req.body;

        console.log('\n========== GET VEHICLE TYPES ==========');
        console.log('type:', type, '| pickup:', pickupLat, pickupLng, '| end:', endLat, endLng);

        // 1. Validation
        if (!['taxi', 'bike'].includes(type?.toLowerCase())) {
            return next(createError.BadRequest('Invalid type. Must be "taxi" or "bike".'));
        }
        if (!pickupLat || !pickupLng || !endLat || !endLng) {
            return next(createError.BadRequest('All four coordinates are required.'));
        }

        // 'taxi' or 'bike' — exactly as stored in DB useFor field
        const requestedUseFor = type.toLowerCase();

        // 'Taxi' or 'Bike' — for Type model typeFor field
        const typeFor = requestedUseFor === 'bike' ? 'Bike' : 'Taxi';

        const radiusInMeters = Number(process.env.RADIUS_IN_METERS) || 5000;

        let nearbyDrivers = [];

        // ==================== 1. SOCKET MAP ====================
        if (global.io?.activeDrivers instanceof Map && global.io.activeDrivers.size > 0) {
            console.log(`✅ [SOCKET] Map size: ${global.io.activeDrivers.size}`);

            global.io.activeDrivers.forEach((driverData, driverId) => {
                console.log(`  Driver ${driverId}: status=${driverData.status} useFor=${driverData.useFor} type=${driverData.type} lat=${driverData.lat} lng=${driverData.lng}`);

                // ✅ useFor se match — DB se store hai, exact match karega
                if (driverData.status !== 'online') return;
                if (driverData.useFor !== requestedUseFor) return;
                if (driverData.lat == null || driverData.lng == null) return;
                if (isNaN(driverData.lat) || isNaN(driverData.lng)) return;

                const distance = geolib.getDistance(
                    { latitude: Number(pickupLat), longitude: Number(pickupLng) },
                    { latitude: driverData.lat, longitude: driverData.lng }
                );

                console.log(`  ✅ useFor matched | distance: ${distance}m`);

                if (distance <= radiusInMeters) {
                    nearbyDrivers.push({
                        driverId,
                        type: driverData.type || null,   // ObjectId string
                        lat: driverData.lat,
                        lng: driverData.lng,
                        distanceFromPickup: distance,
                        distanceKm: (distance / 1000).toFixed(1) + ' km'
                    });
                }
            });

            console.log(`✅ [SOCKET] Nearby ${requestedUseFor} drivers: ${nearbyDrivers.length}`);
        } else {
            console.warn('⚠️ [SOCKET] activeDrivers not available or empty');
        }

        // ==================== 2. DB FALLBACK ====================
        if (nearbyDrivers.length === 0) {
            console.log('[DB FALLBACK] Querying MongoDB...');

            const dbDrivers = await Driver.find({
                location: {
                    $near: {
                        $geometry: { type: 'Point', coordinates: [Number(pickupLng), Number(pickupLat)] },
                        $maxDistance: radiusInMeters,
                    },
                },
                useFor: requestedUseFor,   // ✅ useFor se match
                status: 'online',
                isDeleted: false,
            })
                .select('_id type location useFor')
                .populate('type', 'name typeFor _id');

            nearbyDrivers = dbDrivers.map(d => {
                const lat = d.location?.coordinates?.[1];
                const lng = d.location?.coordinates?.[0];
                let distance = 0;
                if (lat && lng) {
                    distance = geolib.getDistance(
                        { latitude: Number(pickupLat), longitude: Number(pickupLng) },
                        { latitude: lat, longitude: lng }
                    );
                }
                return {
                    driverId: d._id.toString(),
                    type: d.type?._id?.toString() || null,
                    lat, lng,
                    distanceFromPickup: distance,
                    distanceKm: (distance / 1000).toFixed(1) + ' km'
                };
            });

            console.log(`[DB] Found ${nearbyDrivers.length} nearby drivers`);
        }

        // ==================== 3. Types + Pricing (Phase 1 Fare Engine) ====================
        let [types, fareConfig] = await Promise.all([
            Type.find({ typeFor }).select('-__v -typeFor'),
            getActiveFareConfig(FareConfig),
        ]);

        console.log(`Types in DB for ${typeFor}:`, types.map(t => t._id.toString()));
        console.log(`Nearby driver types:`, nearbyDrivers.map(d => d.type));

        // Filter types jinke liye nearby driver hai
        let availableTypes = types.filter(t =>
            nearbyDrivers.some(d => d.type?.toString() === t._id.toString())
        );

        // ✅ Agar type match nahi hua but nearby drivers hain — sab types dikhao
        // (ye tab hota hai jab driver ka type DB se fetch nahi hua)
        if (availableTypes.length === 0 && nearbyDrivers.length > 0) {
            console.warn('⚠️ Type filter returned 0 — showing all types for this category');
            availableTypes = types;
        }

        availableTypes = availableTypes.map(t => multilingual(t, req));

        // Ride distance for pricing
        const rideDistanceMeters = geolib.getDistance(
            { latitude: Number(pickupLat), longitude: Number(pickupLng) },
            { latitude: Number(endLat), longitude: Number(endLng) }
        );
        const rideDistanceKm = rideDistanceMeters / 1000;

        // Phase 1 MVP Fare System — backend-driven, deterministic, same for
        // every vehicle type (no per-vehicle multiplier in Phase 1 scope).
        const fareResult = calculateFare({ distanceKm: rideDistanceKm, fareConfig });

        // Enrich each type with price + ETA
        availableTypes.forEach(vehicleType => {
            const driversOfThisType = nearbyDrivers.filter(
                d => d.type?.toString() === vehicleType._id.toString()
            );

            // Agar type match nahi — sab drivers use karo ETA ke liye
            const relevantDrivers = driversOfThisType.length > 0 ? driversOfThisType : nearbyDrivers;

            vehicleType.availableDrivers = relevantDrivers.length;
            vehicleType.nearbyDrivers = relevantDrivers;

            // Price — same fare engine result across trip/vehicle types (Phase 1)
            vehicleType.tripType = fareResult.tripType;
            vehicleType.estimatedPrice = fareResult.estimatedTotal;
            vehicleType.price = fareResult.estimatedTotal;
            vehicleType.fareBreakup = {
                baseFare: fareResult.baseFare,
                distanceCharge: fareResult.distanceCharge,
                platformFee: fareResult.platformFee,
                estimatedTotal: fareResult.estimatedTotal,
            };
            vehicleType.distanceRate = undefined;

            // ETA
            if (relevantDrivers.length > 0) {
                let totalMinutes = 0;
                relevantDrivers.forEach(d => {
                    if (d.lat != null && d.lng != null && !isNaN(d.lat) && !isNaN(d.lng)) {
                        const dist = geolib.getDistance(
                            { latitude: d.lat, longitude: d.lng },
                            { latitude: Number(pickupLat), longitude: Number(pickupLng) }
                        );
                        totalMinutes += (dist / 1000 / 30) * 60;
                    }
                });
                const avgMinutes = Math.max(1, Math.ceil(totalMinutes / relevantDrivers.length));
                vehicleType.estimatedArrivalMinutes = avgMinutes;
                vehicleType.time = avgMinutes;
            } else {
                vehicleType.estimatedArrivalMinutes = 0;
                vehicleType.time = 0;
            }
        });

        availableTypes.sort((a, b) => {
            if (a.estimatedArrivalMinutes === 0) return 1;
            if (b.estimatedArrivalMinutes === 0) return -1;
            return a.estimatedArrivalMinutes - b.estimatedArrivalMinutes;
        });

        console.log(`✅ Final: ${availableTypes.length} types | ${nearbyDrivers.length} drivers`);
        console.log('========== DONE ==========\n');

        return res.json({
            code: '1',
            message: 'Vehicle types fetched successfully',
            data: {
                types: availableTypes,
                nearbyVehicles: nearbyDrivers,
                ride: {
                    distanceKm: Number(rideDistanceKm.toFixed(2)),
                    tripType: fareResult.tripType,
                    fareBreakup: {
                        baseFare: fareResult.baseFare,
                        distanceCharge: fareResult.distanceCharge,
                        platformFee: fareResult.platformFee,
                        estimatedTotal: fareResult.estimatedTotal,
                    },
                    pickup: { lat: Number(pickupLat), lng: Number(pickupLng) },
                    dropoff: { lat: Number(endLat), lng: Number(endLng) }
                },
                search: {
                    radiusKm: (radiusInMeters / 1000).toFixed(1),
                    totalNearbyDrivers: nearbyDrivers.length,
                    source: (global.io?.activeDrivers?.size > 0) ? 'socket' : 'database'
                }
            }
        });

    } catch (err) {
        console.error('❌ getVehicleTypes Error:', err);
        next(err);
    }
};

// exports.bookRide = async (req, res, next) => {
//     try {
//         console.log('========== BOOK RIDE API CALLED ==========');
//         console.log('Request Body:', {
//             pickupAddress: req.body.pickupAddress,
//             pickupLat: req.body.pickupLat,
//             pickupLng: req.body.pickupLng,
//             endAddress: req.body.endAddress,
//             endLat: req.body.endLat,
//             endLng: req.body.endLng,
//             type: req.body.type,
//             useFor: req.body.useFor,
//             price: req.body.price,
//             isSchedule: req.body.isSchedule
//         });
//         const user = req.user;

//         const useFor = (req.body.useFor || '').toLowerCase().trim();
//         if (!['taxi', 'bike'].includes(useFor)) {
//             return next(createError.BadRequest('useFor is required and must be "taxi" or "bike"'));
//         }
//         console.log(`✅ Ride type: ${useFor} | Only ${useFor} drivers will be notified`);


//         // ✅ FIXED isSchedule (handle all cases)
//         const isSchedule =
//             req.body.isSchedule == true ||
//             req.body.isSchedule == 'true' ||
//             req.body.isSchedule == 1 ||
//             req.body.isSchedule == '1';

//         let scheduleTime = null;

//         // ✅ Proper validation and date parsing for scheduled ride
//         if (isSchedule) {
//             if (!req.body.scheduleTime) {
//                 return next(createError.BadRequest('scheduleTime is required for scheduled ride'));
//             }

//             scheduleTime = new Date(req.body.scheduleTime);

//             // Check if date is valid
//             if (isNaN(scheduleTime.getTime())) {
//                 return next(createError.BadRequest('Invalid scheduleTime format. Please send valid date'));
//             }

//             // Check if schedule time is in future
//             if (scheduleTime <= new Date()) {
//                 return next(createError.BadRequest('Schedule time must be in the future'));
//             }
//         }

//         // Find nearby drivers
//         const nearbyDrivers = await Driver.find({
//             location: {
//                 $near: {
//                     $geometry: { type: 'Point', coordinates: [req.body.pickupLng, req.body.pickupLat] },
//                     $maxDistance: process.env.RADIUS_IN_METERS || 5000,
//                 },
//             },
//             useFor: useFor,
//             // type: req.body.type,
//             status: 'online',
//             isDeleted: false,
//         }).limit(5);

//         if (nearbyDrivers.length === 0) {
//             return next(createError.BadRequest('No drivers available nearby'));
//         }

//         // ✅ Create Ride Request (FIXED isSchedule force)
//         const rideData = {
//             user: req.user.id,
//             pickupAddress: req.body.pickupAddress,
//             pickupLat: req.body.pickupLat,
//             pickupLng: req.body.pickupLng,
//             endAddress: req.body.endAddress,
//             endLat: req.body.endLat,
//             endLng: req.body.endLng,
//             type: req.body.type,
//             price: req.body.price,
//             isSchedule: isSchedule ? true : false
//         };

//         // ✅ Only add scheduleTime if scheduled
//         if (isSchedule && scheduleTime) {
//             rideData.scheduleTime = scheduleTime;
//         }

//         const ride = await RideReq.create(rideData);

//         await ride.populate('user', 'name phone');

//         console.log(`✅ Ride Request Created | ID: ${ride._id} | Scheduled: ${isSchedule}`);
//         console.log("DEBUG -> isSchedule:", isSchedule, "scheduleTime:", scheduleTime);

//         // ==================== SCHEDULED RIDE LOGIC ====================
//         if (isSchedule) {
//             const schedule = require('node-schedule');

//             schedule.scheduleJob(scheduleTime, async () => {
//                 try {
//                     console.log(`🔔 Scheduled Ride Time Reached! Sending notification for Ride: ${ride._id}`);

//                     const drivers = nearbyDrivers.map(driver => ({
//                         id: driver._id,
//                         distance: 'N/A',
//                         time: 'N/A'
//                     }));

//                     await notifyDriversFirebase(drivers, ride.toObject(), user);

//                     if (global.io) {
//                         global.io.emit('newScheduledRideRequest', {
//                             rideId: ride._id.toString(),
//                             message: `You have a scheduled ride at ${scheduleTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
//                             pickup: { address: ride.pickupAddress },
//                             dropoff: { address: ride.endAddress },
//                             price: ride.price,
//                             scheduleTime: scheduleTime.toISOString(),
//                             useFor: useFor
//                         });
//                     }
//                 } catch (err) {
//                     console.error('Scheduled notification error:', err);
//                 }
//             });

//             console.log(`⏰ Ride scheduled for ${scheduleTime.toLocaleString()}`);

//             return res.json({
//                 code: '1',
//                 message: 'Scheduled ride booked successfully! Drivers will be notified at the scheduled time.',
//                 data: {
//                     rideId: ride._id,
//                     scheduleTime: scheduleTime.toISOString(),
//                     isSchedule: true,
//                     useFor
//                 }
//             });
//         }

//         // ==================== NORMAL (Instant) RIDE ====================
//         const drivers = nearbyDrivers.map((driver, index) => {
//             const driverLocation = {
//                 latitude: driver.location.coordinates[1],
//                 longitude: driver.location.coordinates[0],
//             };
//             const pickupLocation = {
//                 latitude: Number(ride.pickupLat),
//                 longitude: Number(ride.pickupLng),
//             };

//             const distanceInMeters = geolib.getDistance(driverLocation, pickupLocation);
//             const distanceInKm = (distanceInMeters / 1000).toFixed(1);
//             const timeInMinutes = Math.round((distanceInKm / 30) * 60);

//             const distanceText = distanceInMeters < 100
//                 ? `${distanceInMeters} meter away`
//                 : `${distanceInKm} km away`;

//             const timeText = timeInMinutes < 1
//                 ? 'less than a minute away'
//                 : `${timeInMinutes} minutes away`;

//             return {
//                 id: driver.id,
//                 distance: distanceText,
//                 time: timeText,
//                 distanceInKm: parseFloat(distanceInKm)
//             };
//         });

//         console.log('📤 Sending immediate notifications for instant ride...');
//         await notifyDriversFirebase(drivers, ride.toObject(), user);

//         // Socket emit for instant ride
//         // if (global.io) {
//         //     const rideObject = ride.toObject();
//         //     const rideDataForSocket = {
//         //         // rideId: ride._id.toString(),
//         //         // user: { name: ride.user?.name || 'Customer', phone: ride.user?.phone || '' },
//         //         // pickup: { address: ride.pickupAddress, lat: ride.pickupLat, lng: ride.pickupLng },
//         //         // dropoff: { address: ride.endAddress, lat: ride.endLat, lng: ride.endLng },
//         //         // price: ride.price || 0,
//         //         // distance: drivers[0]?.distance || 'N/A',
//         //         // estimatedTime: drivers[0]?.time || 'N/A',
//         //         // 
//         //         driverId: drivers[0]?.id || null,
//         //         userId: user.id,

//         //         ride: rideObject,

//         //         rideId: ride._id.toString(),

//         //         distance: drivers[0]?.distance || 'N/A',
//         //         time: drivers[0]?.time || 'N/A',
//         //         useFor: useFor,


//         //     };

//         //     global.io.emit('newRideRequest', rideDataForSocket);
//         // }

//         if (global.io) {
//             let socketNotified = 0;

//             global.io.activeDrivers?.forEach((driverData, driverId) => {
//                 if (driverData.useFor !== useFor) {
//                     console.log(`  ⛔ Skip driver ${driverId} (useFor: ${driverData.useFor})`);
//                     return;
//                 }
//                 const isNearby = nearbyDrivers.some(d => d._id.toString() === driverId);
//                 if (!isNearby) {
//                     console.log(`  ⛔ Skip driver ${driverId} — not in nearby list`);
//                     return;
//                 }
//                 const matchedDriver = drivers.find(d => d.id.toString() === driverId);

//                 global.io.to(driverData.socketId).emit('newRideRequest', {
//                     driverId: driverId,
//                     userId: user.id,
//                     ride: ride.toObject(),
//                     rideId: ride._id.toString(),
//                     distance: matchedDriver?.distance || 'N/A',
//                     time: matchedDriver?.time || 'N/A',
//                     useFor: useFor,
//                 });

//                 socketNotified++;
//                 console.log(`  ✅ Socket sent to ${useFor} driver: ${driverId}`);
//             });

//             console.log(`✅ activeDrivers map size: ${global.io.activeDrivers?.size || 0}`);
//             console.log(`✅ Socket notifications sent to ${socketNotified} "${useFor}" drivers`);

//             if (socketNotified === 0) {
//                 console.log(`⚠️ Socket map empty — FCM already sent to ${drivers.length} drivers`);
//             }
//         }

//         // return res.json({ code: '1', message: req.t('success'), });
//         return res.json({
//             code: '1',
//             message: req.t('success'),
//             price: ride.price || 0,
//             rideId: ride._id,
//             useFor
//         });

//     } catch (error) {
//         console.error('❌ bookRide Error:', error);
//         next(error);
//     }
// };

exports.bookRide = async (req, res, next) => {
    try {
        console.log('========== BOOK RIDE API CALLED ==========');
        console.log('Request Body:', {
            pickupAddress: req.body.pickupAddress,
            pickupLat: req.body.pickupLat,
            pickupLng: req.body.pickupLng,
            endAddress: req.body.endAddress,
            endLat: req.body.endLat,
            endLng: req.body.endLng,
            type: req.body.type,
            useFor: req.body.useFor,
            price: req.body.price,
            baseFare: req.body.baseFare,
            distanceCharge: req.body.distanceCharge,
            platformFee: req.body.platformFee,
            surgeCharge: req.body.surgeCharge,
            estimatedTotal: req.body.estimatedTotal,
            isSchedule: req.body.isSchedule
        });
        const user = req.user;

        const useFor = (req.body.useFor || '').toLowerCase().trim();
        if (!['taxi', 'bike'].includes(useFor)) {
            return next(createError.BadRequest('useFor is required and must be "taxi" or "bike"'));
        }
        console.log(`✅ Ride type: ${useFor} | Only ${useFor} drivers will be notified`);


        // ✅ FIXED isSchedule (handle all cases)
        const isSchedule =
            req.body.isSchedule == true ||
            req.body.isSchedule == 'true' ||
            req.body.isSchedule == 1 ||
            req.body.isSchedule == '1';

        let scheduleTime = null;

        // ✅ Proper validation and date parsing for scheduled ride
        if (isSchedule) {
            if (!req.body.scheduleTime) {
                return next(createError.BadRequest('scheduleTime is required for scheduled ride'));
            }

            scheduleTime = new Date(req.body.scheduleTime);

            // Check if date is valid
            if (isNaN(scheduleTime.getTime())) {
                return next(createError.BadRequest('Invalid scheduleTime format. Please send valid date'));
            }

            // Check if schedule time is in future
            if (scheduleTime <= new Date()) {
                return next(createError.BadRequest('Schedule time must be in the future'));
            }
        }

        // Find nearby drivers
        const nearbyDrivers = await Driver.find({
            location: {
                $near: {
                    $geometry: { type: 'Point', coordinates: [req.body.pickupLng, req.body.pickupLat] },
                    $maxDistance: process.env.RADIUS_IN_METERS || 5000,
                },
            },
            useFor: useFor,
            // type: req.body.type,
            status: 'online',
            isDeleted: false,
        }).limit(5);

        if (nearbyDrivers.length === 0) {
            return next(createError.BadRequest('No drivers available nearby'));
        }

        // ✅ Phase 1 Fare System — fare is ALWAYS recomputed on the backend
        // (never trusted from the client) so User, Driver & Admin always see
        // the exact same, tamper-proof number.
        const fareConfig = await getActiveFareConfig(FareConfig);
        const bookRideDistanceKm = geolib.getDistance(
            { latitude: Number(req.body.pickupLat), longitude: Number(req.body.pickupLng) },
            { latitude: Number(req.body.endLat), longitude: Number(req.body.endLng) }
        ) / 1000;
        const fareResult = calculateFare({ distanceKm: bookRideDistanceKm, fareConfig });

        const { tripType, baseFare, distanceCharge, platformFee, surgeCharge, estimatedTotal } = fareResult;

        console.log('DEBUG -> Client sent price:', req.body.price, req.body.estimatedTotal,
            '| Backend authoritative fare:', estimatedTotal, '| tripType:', tripType);

        // ✅ Create Ride Request (FIXED isSchedule force)
        const rideData = {
            user: req.user.id,
            pickupAddress: req.body.pickupAddress,
            pickupLat: req.body.pickupLat,
            pickupLng: req.body.pickupLng,
            endAddress: req.body.endAddress,
            endLat: req.body.endLat,
            endLng: req.body.endLng,
            type: req.body.type,
            price: estimatedTotal,
            isSchedule: isSchedule ? true : false,

            // ✅ Backend-computed fare breakdown snapshot (Phase 1)
            tripType,
            baseFare,
            distanceCharge,
            platformFee,
            surgeCharge,
            estimatedTotal,
        };

        // ✅ Only add scheduleTime if scheduled
        if (isSchedule && scheduleTime) {
            rideData.scheduleTime = scheduleTime;
        }

        const ride = await RideReq.create(rideData);

        await ride.populate('user', 'name phone');

        console.log(`✅ Ride Request Created | ID: ${ride._id} | Scheduled: ${isSchedule}`);
        console.log("DEBUG -> isSchedule:", isSchedule, "scheduleTime:", scheduleTime);
        console.log("DEBUG -> Fare breakdown:", { baseFare, distanceCharge, platformFee, surgeCharge, estimatedTotal });

        // ==================== SCHEDULED RIDE LOGIC ====================
        if (isSchedule) {
            const schedule = require('node-schedule');

            schedule.scheduleJob(scheduleTime, async () => {
                try {
                    console.log(`🔔 Scheduled Ride Time Reached! Sending notification for Ride: ${ride._id}`);

                    const drivers = nearbyDrivers.map(driver => ({
                        id: driver._id,
                        distance: 'N/A',
                        time: 'N/A'
                    }));

                    await notifyDriversFirebase(drivers, ride.toObject(), user);

                    if (global.io) {
                        global.io.emit('newScheduledRideRequest', {
                            rideId: ride._id.toString(),
                            message: `You have a scheduled ride at ${scheduleTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
                            pickup: { address: ride.pickupAddress },
                            dropoff: { address: ride.endAddress },
                            price: ride.price,
                            scheduleTime: scheduleTime.toISOString(),
                            useFor: useFor
                        });
                    }
                } catch (err) {
                    console.error('Scheduled notification error:', err);
                }
            });

            console.log(`⏰ Ride scheduled for ${scheduleTime.toLocaleString()}`);

            return res.json({
                code: '1',
                message: 'Scheduled ride booked successfully! Drivers will be notified at the scheduled time.',
                data: {
                    rideId: ride._id,
                    scheduleTime: scheduleTime.toISOString(),
                    isSchedule: true,
                    useFor,

                    // ✅ Phase 1 — backend-computed fare breakup
                    tripType,
                    fareDetails: {
                        baseFare,
                        distanceCharge,
                        platformFee,
                        surgeCharge,
                        estimatedTotal,
                    },
                }
            });
        }

        // ==================== NORMAL (Instant) RIDE ====================
        const drivers = nearbyDrivers.map((driver, index) => {
            const driverLocation = {
                latitude: driver.location.coordinates[1],
                longitude: driver.location.coordinates[0],
            };
            const pickupLocation = {
                latitude: Number(ride.pickupLat),
                longitude: Number(ride.pickupLng),
            };

            const distanceInMeters = geolib.getDistance(driverLocation, pickupLocation);
            const distanceInKm = (distanceInMeters / 1000).toFixed(1);
            const timeInMinutes = Math.round((distanceInKm / 30) * 60);

            const distanceText = distanceInMeters < 100
                ? `${distanceInMeters} meter away`
                : `${distanceInKm} km away`;

            const timeText = timeInMinutes < 1
                ? 'less than a minute away'
                : `${timeInMinutes} minutes away`;

            return {
                id: driver.id,
                distance: distanceText,
                time: timeText,
                distanceInKm: parseFloat(distanceInKm)
            };
        });

        console.log('📤 Sending immediate notifications for instant ride...');
        await notifyDriversFirebase(drivers, ride.toObject(), user);

        // Socket emit for instant ride
        if (global.io) {
            let socketNotified = 0;

            global.io.activeDrivers?.forEach((driverData, driverId) => {
                if (driverData.useFor !== useFor) {
                    console.log(`  ⛔ Skip driver ${driverId} (useFor: ${driverData.useFor})`);
                    return;
                }
                const isNearby = nearbyDrivers.some(d => d._id.toString() === driverId);
                if (!isNearby) {
                    console.log(`  ⛔ Skip driver ${driverId} — not in nearby list`);
                    return;
                }
                const matchedDriver = drivers.find(d => d.id.toString() === driverId);

                global.io.to(driverData.socketId).emit('newRideRequest', {
                    driverId: driverId,
                    userId: user.id,
                    ride: ride.toObject(),
                    rideId: ride._id.toString(),
                    distance: matchedDriver?.distance || 'N/A',
                    time: matchedDriver?.time || 'N/A',
                    useFor: useFor,
                });

                socketNotified++;
                console.log(`  ✅ Socket sent to ${useFor} driver: ${driverId}`);
            });

            console.log(`✅ activeDrivers map size: ${global.io.activeDrivers?.size || 0}`);
            console.log(`✅ Socket notifications sent to ${socketNotified} "${useFor}" drivers`);

            if (socketNotified === 0) {
                console.log(`⚠️ Socket map empty — FCM already sent to ${drivers.length} drivers`);
            }
        }

        return res.json({
            code: '1',
            message: req.t('success'),
            price: ride.price || 0,
            rideId: ride._id,
            useFor,

            // ✅ Phase 1 — backend-computed fare breakup
            tripType,
            fareDetails: {
                baseFare,
                distanceCharge,
                platformFee,
                surgeCharge,
                estimatedTotal,
            },
        });

    } catch (error) {
        console.error('❌ bookRide Error:', error);
        next(error);
    }
};

exports.tempPayment = async (req, res, next) => {
    try {
        let request = await Ride.findById(req.body.requestId)
            .populate({
                path: 'driver',
                populate: { path: 'type', select: '-__v -typeFor -distanceRate -capacity' },
                select: 'name profile phone',
            })
            .lean();

        if (!request) return next(createError.BadRequest('Invalid requestId.'));

        if (request.driver?.type)
            request.type = multilingual(request.driver?.type, req);

        request.driver.type = undefined;
        request.otp = undefined;
        request.__v = undefined;
        request.status = undefined;
        request.rideStatus = undefined;
        request.isSchedule = undefined;
        request.time = undefined;
        request.distance = undefined;

        await Ride.findByIdAndUpdate(request._id, {
            status: 'Completed',
            rideStatus: 'complete',
        }).catch(error => console.log('Error updating ride:', error));

        sendOnlyNotification(req.user.fcmToken, {
            title: 'Ride has been completed.',
            body: 'Your ride has been successfully completed. Thank you for using our service!',
        });

        res.json({ code: '1', message: req.t('success'), data: request });
    } catch (error) {
        console.log('error:', error);
        next(error);
    }
};

// exports.cancelRide = async (req, res, next) => {
//     try {
//         const ride = await Ride.findById(req.body.rideId).populate('user driver', 'name fcmToken');

//         if (
//             !ride ||
//             ['Completed', 'Cancelled', 'Expired'].includes(ride.status) ||
//             ride.rideStatus === 'wayToDone'
//         )
//             return next(createError.NotFound('Ride not found with given id.'));

//         ride.status = 'Cancelled';
//         ride.cancellationReason = req.body.cancellationReason || 'No reason provided';

//         await Promise.all([
//             ride.save(),
//             Driver.findByIdAndUpdate(ride.driver, { status: 'online' }),
//         ]);

//         sendOnlyNotification(ride.driver.fcmToken, {
//             title: 'Ride has been cancelled.',
//             body: `Your ride has been cancelled by ${ride.user.name}. Reason - ${ride.cancellationReason}.`,
//         });

//         global.io.to(ride.driver.toString()).emit('cancelRide', { ride });

//         res.json({ code: '1', message: req.t('ride.cancel') });
//     } catch (error) {
//         next(error);
//     }
// };

exports.cancelRide = async (req, res, next) => {
    try {
        const { rideId, cancelReasonId, customReason } = req.body;

        if (!rideId) {
            return next(createError.BadRequest('rideId is required.'));
        }
        if (!cancelReasonId) {
            return next(createError.BadRequest('cancelReasonId is required.'));
        }

        const ride = await Ride.findById(rideId).populate('user driver', 'name fcmToken');

        if (
            !ride ||
            ['Completed', 'Cancelled', 'Expired'].includes(ride.status) ||
            ride.rideStatus === 'wayToDone'
        )
            return next(createError.NotFound('Ride not found with given id.'));

        // ✅ Resolve cancellation reason from the dynamic Cancellation Policy
        const reasonDoc = await CancelReason.findOne({
            _id: cancelReasonId,
            isActive: true,
            appliesTo: { $in: ['ride', 'both'] },
        });

        if (!reasonDoc) {
            return next(createError.BadRequest('Invalid cancelReasonId.'));
        }

        let reasonText;

        if (reasonDoc.isOther) {
            // ✅ "Other" select kiya hai — customReason ab COMPULSORY hai
            if (!customReason || !customReason.trim()) {
                return next(createError.BadRequest('Please specify a reason for "Other".'));
            }
            reasonText = customReason.trim();
        } else {
            // ✅ Koi normal reason select kiya hai — customReason bheja bhi ho to IGNORE karo
            reasonText = reasonDoc.reason;
        }

        ride.status = 'Cancelled';
        ride.cancellationReason = reasonText;
        ride.cancelReasonId = reasonDoc._id;

        await Promise.all([
            ride.save(),
            Driver.findByIdAndUpdate(ride.driver, { status: 'online' }),
        ]);

        sendOnlyNotification(ride.driver.fcmToken, {
            title: 'Ride has been cancelled.',
            body: `Your ride has been cancelled by ${ride.user.name}. Reason - ${ride.cancellationReason}.`,
        });

        global.io.to(ride.driver.toString()).emit('cancelRide', { ride });

        res.json({ code: '1', message: req.t('ride.cancel') });
    } catch (error) {
        if (error.name === 'CastError') {
            return next(createError.BadRequest('Invalid rideId or cancelReasonId.'));
        }
        next(error);
    }
};
// exports.getRides = async (req, res, next) => {
//     try {
//         let rides = await Ride.find({ user: req.user.id })
//             .populate('user', 'name phone')
//             .populate({
//                 path: 'driver',
//                 match: { isDeleted: false },
//                 select: 'name profile phone rating useFor type',
//                 populate: {
//                     path: 'type',
//                     select: 'en fr ar typeFor image'
//                 }
//             })
//             .select('-__v')
//             .sort('-_id')
//             .lean();

//         rides = await Promise.all(
//             rides.map(async (ride) => {

//                 const transaction = await Transaction.findOne({
//                     $or: [
//                         { rideId: ride._id },
//                         { rideId: ride._id.toString() },
//                         { referenceId: ride._id }
//                     ]
//                 }).sort({ createdAt: -1 }).lean();

//                 // ================= VEHICLE TYPE from driver.type =================
//                 let vehicleType = null;
//                 let vehicleTypeImage = null;
//                 let rideMode = null;
//                 let vehicleImage = null;

//                 if (ride.driver?.type) {
//                     const lang = req.language ||
//                         req.headers['accept-language']?.slice(0, 2) ||
//                         'en';

//                     vehicleType = ride.driver.type[lang]?.name
//                         || ride.driver.type.en?.name
//                         || null;

//                     vehicleTypeImage = ride.driver.type.image || null;
//                 }

//                 if (ride.driver?.useFor) {
//                     rideMode = ride.driver.useFor.toLowerCase().trim();
//                 }
//                 if (!rideMode && ride.driver?.type?.typeFor) {
//                     rideMode = ride.driver.type.typeFor.toLowerCase();
//                 }

//                 if (rideMode === 'taxi' || rideMode === 'car') {
//                     vehicleImage = "/img/taxi.png";
//                 } else if (rideMode === 'bike') {
//                     vehicleImage = "/img/bike.png";
//                 }

//                 // ================= PAYMENT METHOD IMAGE =================
//                 let paymentMethod = transaction?.paymentMethod || null;
//                 let paymentImage = null;

//                 if (paymentMethod) {
//                     const method = paymentMethod.toLowerCase().trim();
//                     if (method === 'cash') {
//                         paymentImage = "/img/cash.png";
//                     } else if (method === 'wallet') {
//                         paymentImage = "/img/wallet.png";
//                     } else if (['stripe', 'card', 'online'].includes(method)) {
//                         paymentImage = "/img/stripe.png";
//                     }
//                 }

//                 // ✅ Trip date — activity screen ke liye (scheduled ho to scheduleTime, warna createdAt)
//                 const tripDate = ride.isSchedule && ride.scheduleTime
//                     ? ride.scheduleTime
//                     : ride.createdAt;

//                 return {
//                     ...ride,
//                     rideMode,
//                     vehicleType,
//                     vehicleTypeImage,
//                     vehicleImage,
//                     paymentMethod,
//                     paymentImage,
//                     paymentStatus: transaction?.status || null,
//                     amount: transaction?.amount || null,
//                     scheduledTime: ride.isSchedule ? ride.scheduleTime : null,

//                     // ✅ NEW — Fare breakdown + trip date
//                     tripDate,
//                     fareDetails: {
//                         baseFare: ride.baseFare || 0,
//                         distanceCharge: ride.distanceCharge || 0,
//                         platformFee: ride.platformFee || 0,
//                         surgeCharge: ride.surgeCharge || 0,
//                         estimatedTotal: ride.estimatedTotal || ride.price || 0,
//                     },
//                 };
//             })
//         );

//         res.json({
//             code: '1',
//             message: req.t('success'),
//             rides
//         });

//     } catch (error) {
//         console.log('❌ getRides Error:', error);
//         next(error);
//     }
// };


exports.getRides = async (req, res, next) => {
    try {
        const type = (req.query.type || 'all').toLowerCase();

        if (!['upcoming', 'past', 'all'].includes(type)) {
            return next(createError.BadRequest('type must be "upcoming", "past", or "all"'));
        }

        const now = new Date();
        const baseFilter = { user: req.user.id };

        // ================= COMMON POPULATE & PROCESS FUNCTION =================
        const processRides = async (rides) => {
            return Promise.all(
                rides.map(async (ride) => {
                    const transaction = await Transaction.findOne({
                        $or: [
                            { rideId: ride._id },
                            { rideId: ride._id.toString() },
                            { referenceId: ride._id }
                        ]
                    }).sort({ createdAt: -1 }).lean();

                    // ================= VEHICLE TYPE =================
                    let vehicleType = null;
                    let vehicleTypeImage = null;
                    let rideMode = null;
                    let vehicleImage = null;

                    if (ride.driver?.type) {
                        const lang = req.language ||
                            req.headers['accept-language']?.slice(0, 2) ||
                            'en';

                        vehicleType = ride.driver.type[lang]?.name
                            || ride.driver.type.en?.name
                            || null;

                        vehicleTypeImage = ride.driver.type.image || null;
                    }

                    if (ride.driver?.useFor) {
                        rideMode = ride.driver.useFor.toLowerCase().trim();
                    }
                    if (!rideMode && ride.driver?.type?.typeFor) {
                        rideMode = ride.driver.type.typeFor.toLowerCase();
                    }

                    if (rideMode === 'taxi' || rideMode === 'car') {
                        vehicleImage = "/img/taxi.png";
                    } else if (rideMode === 'bike') {
                        vehicleImage = "/img/bike.png";
                    }

                    // ================= PAYMENT METHOD =================
                    let paymentMethod = transaction?.paymentMethod || null;
                    let paymentImage = null;

                    if (paymentMethod) {
                        const method = paymentMethod.toLowerCase().trim();
                        paymentMethod = method.charAt(0).toUpperCase() + method.slice(1);

                        if (method === 'cash') {
                            paymentImage = "/img/cash.png";
                        } else if (method === 'wallet') {
                            paymentImage = "/img/wallet.png";
                        } else if (['stripe', 'card', 'online'].includes(method)) {
                            paymentImage = "/img/stripe.png";
                        }
                    }

                    const tripDate = ride.isSchedule && ride.scheduleTime
                        ? ride.scheduleTime
                        : ride.createdAt;

                    const isPastStatus = ['Completed', 'Cancelled', 'Expired'].includes(ride.status);
                    const isFutureScheduled = ride.isSchedule && ride.scheduleTime && new Date(ride.scheduleTime) > now;

                    const rideGroup = isPastStatus
                        ? 'Past'
                        : (isFutureScheduled || ['Ongoing', 'Upcoming'].includes(ride.status))
                            ? 'Upcoming'
                            : 'Past';

                    return {
                        ...ride,
                        rideMode,
                        vehicleType,
                        vehicleTypeImage,
                        vehicleImage,
                        paymentMethod,
                        paymentImage,
                        paymentStatus: transaction?.status || null,
                        amount: transaction?.amount || null,
                        scheduledTime: ride.isSchedule ? ride.scheduleTime : null,
                        tripDate,
                        rideGroup,
                        fareDetails: {
                            baseFare: ride.baseFare || 0,
                            distanceCharge: ride.distanceCharge || 0,
                            platformFee: ride.platformFee || 0,
                            surgeCharge: ride.surgeCharge || 0,
                            estimatedTotal: ride.estimatedTotal || ride.price || 0,
                        },
                    };
                })
            );
        };

        // ================= FILTER =================
        let upcomingFilter = {
            ...baseFilter,
            $or: [
                { status: { $in: ['Ongoing', 'Upcoming'] } },
                {
                    isSchedule: true,
                    scheduleTime: { $gt: now },
                    status: { $nin: ['Completed', 'Cancelled', 'Expired'] }
                }
            ]
        };

        let pastFilter = {
            ...baseFilter,
            $or: [
                { status: { $in: ['Completed', 'Cancelled', 'Expired'] } },
                {
                    isSchedule: true,
                    scheduleTime: { $lte: now },
                    status: { $nin: ['Ongoing', 'Upcoming'] }
                }
            ]
        };

        // ================= FETCH =================
        if (type === 'upcoming') {
            let rides = await Ride.find(upcomingFilter)
                .populate('user', 'name phone')
                .populate({
                    path: 'driver',
                    match: { isDeleted: false },
                    select: 'name profile phone rating useFor type',
                    populate: {
                        path: 'type',
                        select: 'en fr ar typeFor image'
                    }
                })
                .select('-__v')
                .sort('-_id')
                .lean();

            rides = await processRides(rides);

            return res.json({
                code: '1',
                message: req.t('success'),
                type: 'upcoming',
                count: rides.length,
                rides
            });
        }

        if (type === 'past') {
            let rides = await Ride.find(pastFilter)
                .populate('user', 'name phone')
                .populate({
                    path: 'driver',
                    match: { isDeleted: false },
                    select: 'name profile phone rating useFor type',
                    populate: {
                        path: 'type',
                        select: 'en fr ar typeFor image'
                    }
                })
                .select('-__v')
                .sort('-_id')
                .lean();

            rides = await processRides(rides);

            return res.json({
                code: '1',
                message: req.t('success'),
                type: 'past',
                count: rides.length,
                rides
            });
        }

        // ================= type = 'all' → Upcoming & Past ALAG-ALAG =================
        const [upcomingRidesRaw, pastRidesRaw] = await Promise.all([
            Ride.find(upcomingFilter)
                .populate('user', 'name phone')
                .populate({
                    path: 'driver',
                    match: { isDeleted: false },
                    select: 'name profile phone rating useFor type',
                    populate: {
                        path: 'type',
                        select: 'en fr ar typeFor image'
                    }
                })
                .select('-__v')
                .sort('-_id')
                .lean(),

            Ride.find(pastFilter)
                .populate('user', 'name phone')
                .populate({
                    path: 'driver',
                    match: { isDeleted: false },
                    select: 'name profile phone rating useFor type',
                    populate: {
                        path: 'type',
                        select: 'en fr ar typeFor image'
                    }
                })
                .select('-__v')
                .sort('-_id')
                .lean()
        ]);

        const [upcoming, past] = await Promise.all([
            processRides(upcomingRidesRaw),
            processRides(pastRidesRaw)
        ]);

        res.json({
            code: '1',
            message: req.t('success'),
            type: 'all',
            upcomingCount: upcoming.length,
            pastCount: past.length,
            upcoming,   // ← Scheduled + Ongoing rides (payment bhi dikhega agar hua hai)
            past        // ← Completed / Cancelled / Expired
        });

    } catch (error) {
        console.log('❌ getRides Error:', error);
        next(error);
    }
};

exports.addRating = async (req, res, next) => {
    try {
        const { driverId, rating: newRating, comment } = req.body;

        let updatedRating = await Rating.findOne({ driver: driverId, user: req.user.id });

        if (updatedRating) {
            updatedRating.rating = newRating;
            updatedRating.comment = comment;
        } else {
            updatedRating = new Rating({ driver: driverId, user: req.user.id, rating: newRating, comment });
        }
        await updatedRating.save();

        Rating.aggregate([
            { $match: { driver: updatedRating.driver } },
            { $group: { _id: '$driver', averageRating: { $avg: '$rating' } } },
        ]).then(averageRatings => {
            const averageRating = averageRatings[0].averageRating.toFixed(1);
            Driver.findByIdAndUpdate(driverId, { rating: averageRating }).exec();
        });

        res.json({ code: '1', message: req.t('rating.added'), rating: updatedRating });
    } catch (error) {
        if (error.name == 'CastError')
            return next(createError.BadRequest('Invalid driverId.'));
        next(error);
    }
};

// ✅ Fare Details — Choose Ride card tap karne par modal ke liye
// Phase 1 MVP Fare System: backend-driven trip classification + fare breakup.
exports.getFareDetails = async (req, res, next) => {
    try {
        const { type, pickupLat, pickupLng, endLat, endLng } = req.body;

        if (!type) {
            return next(createError.BadRequest('type (vehicle type id) is required.'));
        }
        if (!pickupLat || !pickupLng || !endLat || !endLng) {
            return next(createError.BadRequest('All four coordinates are required.'));
        }

        const [vehicleType, fareConfig] = await Promise.all([
            Type.findById(type),
            getActiveFareConfig(FareConfig),
        ]);

        if (!vehicleType) {
            return next(createError.BadRequest('Invalid vehicle type id.'));
        }

        const distanceMeters = geolib.getDistance(
            { latitude: Number(pickupLat), longitude: Number(pickupLng) },
            { latitude: Number(endLat), longitude: Number(endLng) }
        );
        const distanceKm = distanceMeters / 1000;

        const fareResult = calculateFare({ distanceKm, fareConfig });

        // ✅ UI-matching response — exactly matches Fare Details modal
        res.json({
            code: '1',
            message: 'Fare details fetched successfully',
            data: {
                tripType: fareResult.tripType,
                distanceKm: fareResult.distanceKm,
                baseFare: fareResult.baseFare,
                distanceCharge: fareResult.distanceCharge,
                distanceChargeBreakdown: fareResult.distanceChargeBreakdown, // dynamic per-mile-band detail
                effectiveRatePerMile: fareResult.perMileRate,
                platformFee: fareResult.platformFee,
                surgeCharge: fareResult.surgeCharge,
                estimatedTotal: fareResult.estimatedTotal,
                fees: fareResult.fees,
            },
        });
    } catch (error) {
        console.error('❌ getFareDetails Error:', error);
        if (error.name === 'CastError') {
            return next(createError.BadRequest('Invalid type id.'));
        }
        next(error);
    }
};

// Call this inside your ride-completion controller
exports.updateOfferProgress = async (userId, ride) => {
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
            // We recalculate on the fly in getOffers, so nothing to store
            // (or you can increment currentCount if you prefer)
        }
        else if (offer.progressType === 'consecutive_days') {
            const rideDate = new Date(ride.createdAt).setHours(0, 0, 0, 0);
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
                    progress.consecutiveDays = 1; // streak broken
                }
                // same day → do nothing
            }
            progress.lastRideDate = ride.createdAt;
        }
        else if (offer.progressType === 'rides_in_time_window') {
            // check if ride time falls in window
            const rideHour = new Date(ride.createdAt).getHours();
            const rideMin = new Date(ride.createdAt).getMinutes();
            const rideTime = rideHour * 60 + rideMin;

            const [sH, sM] = offer.timeWindowStart.split(':').map(Number);
            const [eH, eM] = offer.timeWindowEnd.split(':').map(Number);
            const startMin = sH * 60 + sM;
            const endMin = eH * 60 + eM;

            if (rideTime >= startMin && rideTime <= endMin) {
                progress.currentCount += 1;
            }
        }

        // check completion
        const current = offer.progressType === 'consecutive_days'
            ? progress.consecutiveDays
            : progress.currentCount;

        if (current >= offer.targetCount) {
            progress.isCompleted = true;
            progress.completedAt = now;
            // credit wallet / create reward here
            // await creditWallet(userId, offer.rewardValue);
        }

        await progress.save();
    }
};