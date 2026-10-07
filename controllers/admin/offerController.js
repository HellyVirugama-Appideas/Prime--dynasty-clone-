// const Offer = require('../../models/offerModel');
// const deleteFile = require('../../utils/deleteFile');

// // GET — List all offers
// exports.listOffers = async (req, res) => {
//     try {
//         const statusFilter = req.query.status || 'all';
//         const now = new Date();

//         let offers = await Offer.find({ isDeleted: false }).sort('-createdAt').lean();

//         // Counts for stat boxes
//         const totalCount = offers.length;
//         const activeCount = offers.filter(o => o.isActive && now >= new Date(o.validFrom) && now <= new Date(o.validTo)).length;
//         const inactiveCount = offers.filter(o => !o.isActive).length;
//         const expiredCount = offers.filter(o => now > new Date(o.validTo)).length;

//         // Apply filter
//         if (statusFilter === 'active') {
//             offers = offers.filter(o => o.isActive && now >= new Date(o.validFrom) && now <= new Date(o.validTo));
//         } else if (statusFilter === 'inactive') {
//             offers = offers.filter(o => !o.isActive);
//         } else if (statusFilter === 'expired') {
//             offers = offers.filter(o => now > new Date(o.validTo));
//         }

//         res.render('offerlist', {
//             title: 'Offers',
//             offers,
//             totalCount,
//             activeCount,
//             inactiveCount,
//             expiredCount,
//             statusFilter,
//             currentPage: 1,
//         });
//     } catch (error) {
//         console.error('listOffers Error:', error);
//         req.flash('error', 'Something went wrong while loading offers.');
//         res.redirect('/admin');
//     }
// };

// // GET — Add offer form
// exports.addOfferForm = (req, res) => {
//     res.render('offeradd', { title: 'Add Offer', formData: {} });
// };

// // POST — Create offer
// exports.createOffer = async (req, res) => {
//     try {
//         const {
//             title, code, description,
//             discountType, discountValue, maxDiscount, minOrderAmount,
//             applicableOn, validFrom, validTo,
//             usageLimitPerUser, totalUsageLimit,
//         } = req.body;

//         if (!title || !code || !discountType || !discountValue || !validFrom || !validTo) {
//             req.flash('error', 'Please fill all required fields.');
//             return res.render('offeradd', { title: 'Add Offer', formData: req.body });
//         }

//         const existing = await Offer.findOne({ code: code.toUpperCase().trim(), isDeleted: false });
//         if (existing) {
//             req.flash('error', 'An offer with this code already exists.');
//             return res.render('offeradd', { title: 'Add Offer', formData: req.body });
//         }

//         let image;
//         if (req.files?.image) {
//             image = `/uploads/${req.files.image.name}`;
//             await req.files.image.mv(`./public/uploads/${req.files.image.name}`);
//         }

//         await Offer.create({
//             title,
//             code: code.toUpperCase().trim(),
//             description,
//             image,
//             discountType,
//             discountValue: Number(discountValue),
//             maxDiscount: Number(maxDiscount) || 0,
//             minOrderAmount: Number(minOrderAmount) || 0,
//             applicableOn: applicableOn || 'all',
//             validFrom: new Date(validFrom),
//             validTo: new Date(validTo),
//             usageLimitPerUser: usageLimitPerUser !== undefined ? Number(usageLimitPerUser) : 1,
//             totalUsageLimit: Number(totalUsageLimit) || 0,
//             isActive: true,
//         });

//         req.flash('success', 'Offer created successfully.');
//         res.redirect('/admin/offers');
//     } catch (error) {
//         console.error('createOffer Error:', error);
//         req.flash('error', 'Failed to create offer.');
//         res.render('offeradd', { title: 'Add Offer', formData: req.body });
//     }
// };

// // GET — Edit offer form
// exports.editOfferForm = async (req, res) => {
//     try {
//         const offer = await Offer.findById(req.params.id).lean();
//         if (!offer) {
//             req.flash('error', 'Offer not found.');
//             return res.redirect('/admin/offers');
//         }
//         res.render('offeredit', { title: 'Edit Offer', offer });
//     } catch (error) {
//         console.error('editOfferForm Error:', error);
//         req.flash('error', 'Something went wrong.');
//         res.redirect('/admin/offers');
//     }
// };

// // POST — Update offer
// exports.updateOffer = async (req, res) => {
//     try {
//         const {
//             title, code, description,
//             discountType, discountValue, maxDiscount, minOrderAmount,
//             applicableOn, validFrom, validTo,
//             usageLimitPerUser, totalUsageLimit,
//         } = req.body;

//         const offer = await Offer.findById(req.params.id);
//         if (!offer) {
//             req.flash('error', 'Offer not found.');
//             return res.redirect('/admin/offers');
//         }

//         if (req.files?.image) {
//             if (offer.image) deleteFile(`./public${offer.image}`);
//             offer.image = `/uploads/${req.files.image.name}`;
//             await req.files.image.mv(`./public/uploads/${req.files.image.name}`);
//         }

//         offer.title = title;
//         offer.code = code.toUpperCase().trim();
//         offer.description = description;
//         offer.discountType = discountType;
//         offer.discountValue = Number(discountValue);
//         offer.maxDiscount = Number(maxDiscount) || 0;
//         offer.minOrderAmount = Number(minOrderAmount) || 0;
//         offer.applicableOn = applicableOn || 'all';
//         offer.validFrom = new Date(validFrom);
//         offer.validTo = new Date(validTo);
//         offer.usageLimitPerUser = usageLimitPerUser !== undefined ? Number(usageLimitPerUser) : offer.usageLimitPerUser;
//         offer.totalUsageLimit = Number(totalUsageLimit) || 0;

//         await offer.save();
//         req.flash('success', 'Offer updated successfully.');
//         res.redirect('/admin/offers');
//     } catch (error) {
//         console.error('updateOffer Error:', error);
//         req.flash('error', 'Failed to update offer.');
//         res.redirect('/admin/offers');
//     }
// };

// // POST — Toggle active/inactive
// exports.toggleOfferStatus = async (req, res) => {
//     try {
//         const offer = await Offer.findById(req.params.id);
//         if (offer) {
//             offer.isActive = !offer.isActive;
//             await offer.save();
//             req.flash('success', `Offer ${offer.isActive ? 'activated' : 'deactivated'}.`);
//         }
//         res.redirect('/admin/offers');
//     } catch (error) {
//         console.error('toggleOfferStatus Error:', error);
//         req.flash('error', 'Failed to update status.');
//         res.redirect('/admin/offers');
//     }
// };

// // POST — Soft delete
// exports.deleteOffer = async (req, res) => {
//     try {
//         await Offer.findByIdAndUpdate(req.params.id, { isDeleted: true });
//         req.flash('success', 'Offer deleted.');
//         res.redirect('/admin/offers');
//     } catch (error) {
//         console.error('deleteOffer Error:', error);
//         req.flash('error', 'Failed to delete offer.');
//         res.redirect('/admin/offers');
//     }
// };

const Offer = require('../../models/offerModel');
const deleteFile = require('../../utils/deleteFile');

// Form se aaye progress-reward fields ko parse + validate karta hai
function parseOfferBody(body) {
    const offerType = body.offerType === 'progress' ? 'progress' : 'coupon';

    if (offerType === 'coupon') {
        if (!body.discountType || !body.discountValue) {
            return { error: 'Please fill all required fields.' };
        }
        return {
            data: {
                offerType: 'coupon',
                discountType: body.discountType,
                discountValue: Number(body.discountValue),
                // coupon par progress fields clear
                progressType: undefined,
                periodType: undefined,
                targetCount: 0,
                rewardValue: 0,
                rewardType: 'wallet_credit',
                timeWindowStart: undefined,
                timeWindowEnd: undefined,
            },
        };
    }

    const targetCount = Number(body.targetCount);
    const rewardValue = Number(body.rewardValue);
    if (!body.progressType) return { error: 'Please select a progress type.' };
    if (!targetCount || targetCount < 1) return { error: 'Target value must be at least 1.' };
    if (!rewardValue || rewardValue <= 0) return { error: 'Reward amount must be greater than 0.' };
    if (body.progressType === 'rides_in_period' && !body.periodType) {
        return { error: 'Please select a period (week / month).' };
    }
    if (body.progressType === 'rides_in_time_window' && (!body.timeWindowStart || !body.timeWindowEnd)) {
        return { error: 'Please set time window start and end.' };
    }

    return {
        data: {
            offerType: 'progress',
            progressType: body.progressType,
            periodType: body.progressType === 'rides_in_period' ? body.periodType : undefined,
            targetCount,
            rewardValue,
            rewardType: 'wallet_credit',
            timeWindowStart: body.progressType === 'rides_in_time_window' ? body.timeWindowStart : undefined,
            timeWindowEnd: body.progressType === 'rides_in_time_window' ? body.timeWindowEnd : undefined,
            // model me discount fields required hain, isliye reward se bhar dete hain
            discountType: 'flat',
            discountValue: rewardValue,
        },
    };
}

// GET — List all offers
exports.listOffers = async (req, res) => {
    try {
        const statusFilter = req.query.status || 'all';
        const now = new Date();

        let offers = await Offer.find({ isDeleted: false }).sort('-createdAt').lean();

        // Counts for stat boxes
        const totalCount = offers.length;
        const activeCount = offers.filter(o => o.isActive && now >= new Date(o.validFrom) && now <= new Date(o.validTo)).length;
        const inactiveCount = offers.filter(o => !o.isActive).length;
        const expiredCount = offers.filter(o => now > new Date(o.validTo)).length;

        // Apply filter
        if (statusFilter === 'active') {
            offers = offers.filter(o => o.isActive && now >= new Date(o.validFrom) && now <= new Date(o.validTo));
        } else if (statusFilter === 'inactive') {
            offers = offers.filter(o => !o.isActive);
        } else if (statusFilter === 'expired') {
            offers = offers.filter(o => now > new Date(o.validTo));
        }

        res.render('offerlist', {
            title: 'Offers',
            offers,
            totalCount,
            activeCount,
            inactiveCount,
            expiredCount,
            statusFilter,
            currentPage: 1,
        });
    } catch (error) {
        console.error('listOffers Error:', error);
        req.flash('error', 'Something went wrong while loading offers.');
        res.redirect('/admin');
    }
};

// GET — Add offer form
exports.addOfferForm = (req, res) => {
    res.render('offeradd', { title: 'Add Offer', formData: {} });
};

// POST — Create offer
exports.createOffer = async (req, res) => {
    try {
        const {
            title, code, description,
            discountType, discountValue, maxDiscount, minOrderAmount,
            applicableOn, validFrom, validTo,
            usageLimitPerUser, totalUsageLimit,
        } = req.body;

        if (!title || !code || !validFrom || !validTo) {
            req.flash('error', 'Please fill all required fields.');
            return res.render('offeradd', { title: 'Add Offer', formData: req.body });
        }

        const parsed = parseOfferBody(req.body);
        if (parsed.error) {
            req.flash('error', parsed.error);
            return res.render('offeradd', { title: 'Add Offer', formData: req.body });
        }

        const existing = await Offer.findOne({ code: code.toUpperCase().trim(), isDeleted: false });
        if (existing) {
            req.flash('error', 'An offer with this code already exists.');
            return res.render('offeradd', { title: 'Add Offer', formData: req.body });
        }

        let image;
        if (req.files?.image) {
            image = `/uploads/${req.files.image.name}`;
            await req.files.image.mv(`./public/uploads/${req.files.image.name}`);
        }

        await Offer.create({
            title,
            code: code.toUpperCase().trim(),
            description,
            image,
            ...parsed.data,
            maxDiscount: Number(maxDiscount) || 0,
            minOrderAmount: Number(minOrderAmount) || 0,
            applicableOn: applicableOn || 'all',
            validFrom: new Date(validFrom),
            validTo: new Date(validTo),
            usageLimitPerUser: usageLimitPerUser !== undefined ? Number(usageLimitPerUser) : 1,
            totalUsageLimit: Number(totalUsageLimit) || 0,
            isActive: true,
        });

        req.flash('success', 'Offer created successfully.');
        res.redirect('/admin/offers');
    } catch (error) {
        console.error('createOffer Error:', error);
        req.flash('error', 'Failed to create offer.');
        res.render('offeradd', { title: 'Add Offer', formData: req.body });
    }
};

// GET — Edit offer form
exports.editOfferForm = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id).lean();
        if (!offer) {
            req.flash('error', 'Offer not found.');
            return res.redirect('/admin/offers');
        }
        res.render('offeredit', { title: 'Edit Offer', offer });
    } catch (error) {
        console.error('editOfferForm Error:', error);
        req.flash('error', 'Something went wrong.');
        res.redirect('/admin/offers');
    }
};

// POST — Update offer
exports.updateOffer = async (req, res) => {
    try {
        const {
            title, code, description,
            discountType, discountValue, maxDiscount, minOrderAmount,
            applicableOn, validFrom, validTo,
            usageLimitPerUser, totalUsageLimit,
        } = req.body;

        const offer = await Offer.findById(req.params.id);
        if (!offer) {
            req.flash('error', 'Offer not found.');
            return res.redirect('/admin/offers');
        }

        const parsed = parseOfferBody(req.body);
        if (parsed.error) {
            req.flash('error', parsed.error);
            return res.redirect(`/admin/offers/edit/${req.params.id}`);
        }

        if (req.files?.image) {
            if (offer.image) deleteFile(`./public${offer.image}`);
            offer.image = `/uploads/${req.files.image.name}`;
            await req.files.image.mv(`./public/uploads/${req.files.image.name}`);
        }

        offer.title = title;
        offer.code = code.toUpperCase().trim();
        offer.description = description;
        offer.set(parsed.data);
        offer.maxDiscount = Number(maxDiscount) || 0;
        offer.minOrderAmount = Number(minOrderAmount) || 0;
        offer.applicableOn = applicableOn || 'all';
        offer.validFrom = new Date(validFrom);
        offer.validTo = new Date(validTo);
        offer.usageLimitPerUser = usageLimitPerUser !== undefined ? Number(usageLimitPerUser) : offer.usageLimitPerUser;
        offer.totalUsageLimit = Number(totalUsageLimit) || 0;

        await offer.save();
        req.flash('success', 'Offer updated successfully.');
        res.redirect('/admin/offers');
    } catch (error) {
        console.error('updateOffer Error:', error);
        req.flash('error', 'Failed to update offer.');
        res.redirect('/admin/offers');
    }
};

// POST — Toggle active/inactive
exports.toggleOfferStatus = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (offer) {
            offer.isActive = !offer.isActive;
            await offer.save();
            req.flash('success', `Offer ${offer.isActive ? 'activated' : 'deactivated'}.`);
        }
        res.redirect('/admin/offers');
    } catch (error) {
        console.error('toggleOfferStatus Error:', error);
        req.flash('error', 'Failed to update status.');
        res.redirect('/admin/offers');
    }
};

// POST — Soft delete
exports.deleteOffer = async (req, res) => {
    try {
        await Offer.findByIdAndUpdate(req.params.id, { isDeleted: true });
        req.flash('success', 'Offer deleted.');
        res.redirect('/admin/offers');
    } catch (error) {
        console.error('deleteOffer Error:', error);
        req.flash('error', 'Failed to delete offer.');
        res.redirect('/admin/offers');
    }
};