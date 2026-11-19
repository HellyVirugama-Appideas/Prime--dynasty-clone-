const Driver = require('../../models/driverModel');
const SupportMessage = require('../../models/supportMessageModel');
const {
    DOC_LABELS,
    getApplicationStatus,
    buildApplicationInfo,
    approveDriver,
    requestResubmission,
    rejectDriver,
} = require('../../utils/driverApplication');

const PAGE_SIZE = 15;
const TABS = ['all', 'under_review', 'resubmission_required', 'approved', 'rejected', 'incomplete'];

const escapeRegex = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Status tab -> mongo conditions ($and ke andar jaayengi)
const statusConds = status => {
    if (status === 'approved') return [{ approved: true }];
    if (status === 'under_review') {
        return [
            { approved: { $ne: true } },
            { $or: [{ applicationStatus: 'under_review' }, { applicationStatus: { $exists: false } }] },
        ];
    }
    if (['resubmission_required', 'rejected', 'incomplete'].includes(status)) {
        return [{ approved: { $ne: true } }, { applicationStatus: status }];
    }
    return []; // all
};

const buildQuery = (status, search) => {
    const and = [{ isDeleted: { $ne: true } }, ...statusConds(status)];

    if (search) {
        const rx = new RegExp(escapeRegex(search), 'i');
        and.push({ $or: [{ name: rx }, { email: rx }, { phone: rx }, { plateNumber: rx }] });
    }
    return { $and: and };
};

// GET /admin/applications
exports.list = async (req, res) => {
    try {
        const status = TABS.includes(req.query.status) ? req.query.status : 'under_review';
        const search = String(req.query.search || '').trim();
        const page = Math.max(parseInt(req.query.page) || 1, 1);

        const [drivers, total, ...tabCounts] = await Promise.all([
            Driver.find(buildQuery(status, search))
                .sort({ updatedAt: -1 })
                .skip((page - 1) * PAGE_SIZE)
                .limit(PAGE_SIZE)
                .lean(),
            Driver.countDocuments(buildQuery(status, search)),
            ...TABS.map(t => Driver.countDocuments(buildQuery(t, ''))),
        ]);

        const counts = {};
        TABS.forEach((t, i) => (counts[t] = tabCounts[i]));

        res.render('driver_applications', {
            drivers: drivers.map(d => ({ ...d, appStatus: getApplicationStatus(d) })),
            counts,
            status,
            search,
            page,
            totalPages: Math.max(Math.ceil(total / PAGE_SIZE), 1),
            total,
            active: 'applications',
            title: 'Driver Applications',
            url: req.originalUrl,
        });
    } catch (error) {
        console.error('Driver applications list error:', error);
        req.flash('error', error.message);
        res.redirect('/admin');
    }
};

// GET /admin/applications/:id
exports.detail = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id).populate('type').lean();
        if (!driver) throw new Error('Driver not found');

        const defaultAvatar = '/img/avatar.png';

        // requestable: true => admin resubmission me yahi document maang sakta he
        const documents = [
            { key: 'licence_front', label: DOC_LABELS.licence_front, url: driver.licence, requestable: true },
            { key: 'licence_back', label: DOC_LABELS.licence_back, url: driver.licenceBack, requestable: true },
            { key: 'insurance', label: DOC_LABELS.insurance, url: driver.insurance, requestable: true },
            { key: 'vehicle_photo', label: DOC_LABELS.vehicle_photo, url: driver.vehiclePhoto, requestable: true },
            {
                key: 'profile',
                label: 'Profile Photo',
                url: driver.profile && driver.profile !== defaultAvatar ? driver.profile : null,
                requestable: false,
            },
            { key: 'pan', label: 'PAN', url: driver.pan, requestable: false },
            { key: 'rc', label: 'RC', url: driver.rc, requestable: false },
        ].filter(d => d.requestable || d.url); // extra docs sirf tab jab upload hue ho

        const messages = await SupportMessage.find({ driver: driver._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        res.render('driver_application_detail', {
            driver,
            application: buildApplicationInfo(driver),
            appStatus: getApplicationStatus(driver),
            documents,
            docLabels: DOC_LABELS,
            supportMessages: messages,
            active: 'applications',
            title: 'Application Details',
            url: req.originalUrl,
        });
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/admin/applications');
    }
};

// POST /admin/applications/:id/approve
exports.approve = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id).lean();
        if (!driver) throw new Error('Driver not found');

        if (getApplicationStatus(driver) === 'incomplete') {
            throw new Error('Application is incomplete. Driver has not submitted all details yet.');
        }

        await approveDriver(req.params.id);
        req.flash('success', 'Driver approved successfully');
    } catch (error) {
        req.flash('error', error.message);
    }
    res.redirect(`/admin/applications/${req.params.id}`);
};

// POST /admin/applications/:id/resubmit   (body: documents[], reason)
exports.resubmit = async (req, res) => {
    try {
        const docs = [].concat(req.body.documents || []);
        if (!docs.length) throw new Error('Select at least one document to request again.');

        await requestResubmission(req.params.id, docs, req.body.reason);
        req.flash('success', 'Resubmission requested. Driver has been notified.');
    } catch (error) {
        req.flash('error', error.message);
    }
    res.redirect(`/admin/applications/${req.params.id}`);
};

// POST /admin/applications/:id/reject   (body: reason)
exports.reject = async (req, res) => {
    try {
        const reason = String(req.body.reason || '').trim();
        if (!reason) throw new Error('Rejection reason is required.');

        await rejectDriver(req.params.id, reason);
        req.flash('success', 'Application rejected. Driver has been notified.');
    } catch (error) {
        req.flash('error', error.message);
    }
    res.redirect(`/admin/applications/${req.params.id}`);
};