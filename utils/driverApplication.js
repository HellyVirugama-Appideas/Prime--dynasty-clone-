const mongoose = require('mongoose');
const Driver = require('../models/driverModel');
const { maskSSN } = require('./ssn');

let sendNotification = null;
try {
    ({ sendNotification } = require('./sendNotification'));
} catch (e) {
    /* notification optional */
}

const APP_NAME = process.env.APP_NAME || 'ZESS';

// Resubmission me admin in keys me se chunta he
const DOC_LABELS = {
    licence_front: 'Driving License - Front',
    licence_back: 'Driving License - Back',
    insurance: 'Vehicle Insurance Document',
    vehicle_photo: 'Vehicle Photo',
};

// Document key -> Driver model ka field
const DOC_FIELD_MAP = {
    licence_front: 'licence',
    licence_back: 'licenceBack',
    insurance: 'insurance',
    vehicle_photo: 'vehiclePhoto',
};

// Contact Us ka Subject dropdown (Figma)
const CONTACT_SUBJECTS = [
    'Application Status',
    'Registration / Documents',
    'Bank Account',
    'Payment / Withdrawal',
    'Technical Issue',
    'Other',
];

const isPersonalComplete = d => !!(d.ssnLast4 && d.licence && d.licenceBack);
const isVehicleComplete = d => !!(d.type && d.plateNumber && d.insurance && d.vehiclePhoto);

// Purane drivers (approved: true) ke liye bhi sahi chalta he
const getApplicationStatus = d => {
    if (d.approved) return 'approved';
    if (d.applicationStatus) return d.applicationStatus;
    if (!isPersonalComplete(d) || !isVehicleComplete(d)) return 'incomplete';
    return 'under_review';
};

const getNextStep = d => {
    const status = getApplicationStatus(d);

    if (status === 'approved') return 'dashboard';
    if (status === 'rejected') return 'rejected';
    if (status === 'resubmission_required') return 'resubmission';

    if (status === 'incomplete') {
        if (!isPersonalComplete(d)) return 'personal_info';
        if (!isVehicleComplete(d)) return 'vehicle_info';
    }
    return 'application_status';
};

const resubmissionDocs = d =>
    (d.resubmission?.documents || []).map(key => ({ key, label: DOC_LABELS[key] || key }));

// Register / login responses me jaata he
const buildApplicationInfo = d => {
    const status = getApplicationStatus(d);
    return {
        status,
        nextStep: getNextStep(d),
        personalInfoCompleted: isPersonalComplete(d),
        vehicleInfoCompleted: isVehicleComplete(d),
        ssnMasked: maskSSN(d.ssnLast4),
        resubmission:
            status === 'resubmission_required'
                ? { documents: resubmissionDocs(d), reason: d.resubmission?.reason || null }
                : null,
    };
};

// "Application Status" screen (timeline + card)
const buildStatusScreen = d => {
    const status = getApplicationStatus(d);
    const docs = resubmissionDocs(d);
    const reviewing = status === 'under_review' || status === 'resubmission_required';

    const steps = [
        {
            key: 'under_review',
            title: 'Under Review',
            subtitle: 'Admin is checking the application',
            state: status === 'approved' || status === 'rejected' ? 'done' : reviewing ? 'current' : 'pending',
        },
        status === 'rejected'
            ? {
                  key: 'rejected',
                  title: 'Rejected',
                  subtitle: d.rejectionReason || 'Your application was not approved',
                  state: 'rejected',
              }
            : {
                  key: 'approved',
                  title: 'Approved',
                  subtitle: 'Driver can proceed to the app',
                  state: status === 'approved' ? 'done' : 'pending',
              },
    ];

    let card;
    if (status === 'approved') {
        card = {
            type: 'approved',
            title: 'Congratulations!',
            message: `Your ${APP_NAME} Driver application has been approved. You're ready to get started.`,
            buttonText: 'Start Driving or Continue to Dashboard',
            action: 'dashboard',
        };
    } else if (status === 'resubmission_required') {
        card = {
            type: 'resubmission_required',
            title: 'Document Resubmission Required',
            message:
                d.resubmission?.reason ||
                `Your ${docs.map(x => x.label.toLowerCase()).join(', ') || 'document'} needs to be updated. Please upload a valid document to continue.`,
            documents: docs,
            buttonText: 'Resubmit Document',
            action: 'resubmit_document',
        };
    } else if (status === 'rejected') {
        card = {
            type: 'rejected',
            title: 'Application Rejected',
            message: d.rejectionReason || 'Your application could not be approved.',
            buttonText: 'Contact Us',
            action: 'contact_us',
        };
    } else if (status === 'under_review') {
        card = {
            type: 'under_review',
            title: 'Your application is under review',
            message: "We're reviewing your information and documents. We'll notify you when there's an update.",
            buttonText: 'Contact Us',
            action: 'contact_us',
        };
    } else {
        card = {
            type: 'incomplete',
            title: 'Complete your application',
            message: 'Please finish your application to continue.',
            buttonText: 'Continue',
            action: getNextStep(d),
        };
    }

    return { steps, card };
};

// ====================== ADMIN HELPERS ======================
// approved schema me immutable he, isliye native collection se update karte hain
// (Mongoose immutable field ko chupchap ignore kar deta he).
const toId = id => new mongoose.Types.ObjectId(String(id));

const notify = async (driverId, title, body, type) => {
    try {
        if (!sendNotification) return;
        const driver = await Driver.findById(driverId).select('fcmToken');
        if (driver?.fcmToken) {
            await sendNotification(driver.fcmToken, { driver: String(driverId), title, body, type });
        }
    } catch (e) {
        console.log('[driverApplication] notification error:', e.message);
    }
};

const approveDriver = async driverId => {
    const now = new Date();

    await Driver.collection.updateOne(
        { _id: toId(driverId) },
        {
            $set: { approved: true, applicationStatus: 'approved', updatedAt: now },
            $unset: { resubmission: '', rejectionReason: '' },
        }
    );

    // ---- Notification ----
    try {
        const driver = await Driver.findById(driverId).select('fcmToken').lean();
        if (driver?.fcmToken) {
            await sendNotification(driver.fcmToken, {
                driver: String(driverId),
                title: 'Congratulations!',
                body: `Your ${APP_NAME} Driver application has been approved. You're ready to get started.`,
                type: 'application_approved',
                screen: 'application_status',
            });
            console.log(`[APPROVE] notification sent to driver ${driverId}`);
        } else {
            console.warn(`[APPROVE] driver ${driverId} ka fcmToken nahi he, notification skip`);
        }
    } catch (error) {
        console.error('[APPROVE] notification failed:', error.code || error.message);
    }
};

const requestResubmission = async (driverId, documents = [], reason = '') => {
    const keys = [...new Set(documents)].filter(k => DOC_LABELS[k]);
    if (!keys.length) {
        throw new Error(`documents must include at least one of: ${Object.keys(DOC_LABELS).join(', ')}`);
    }

    const cleanReason = String(reason || '').trim();
    const now = new Date();

    await Driver.collection.updateOne(
        { _id: toId(driverId) },
        {
            $set: {
                approved: false, // pehle approved tha to bhi status resubmission_required dikhe
                applicationStatus: 'resubmission_required',
                resubmission: { documents: keys, reason: cleanReason, requestedAt: now },
                updatedAt: now,
            },
            $unset: { rejectionReason: '' },
        }
    );

    // ---- Notification ----
    try {
        const driver = await Driver.findById(driverId).select('fcmToken').lean();
        if (driver?.fcmToken) {
            const docNames = keys.map(k => DOC_LABELS[k]).join(', ');

            await sendNotification(driver.fcmToken, {
                driver: String(driverId),
                title: 'Document Resubmission Required',
                body: cleanReason || `Please resubmit: ${docNames}.`,
                type: 'document_resubmission',
                screen: 'application_status',
                documents: keys.join(','), // FCM data me sirf string allowed he
            });
            console.log(`[RESUBMIT] notification sent to driver ${driverId}`);
        } else {
            console.warn(`[RESUBMIT] driver ${driverId} ka fcmToken nahi he, notification skip`);
        }
    } catch (error) {
        console.error('[RESUBMIT] notification failed:', error.code || error.message);
    }
};

const rejectDriver = async (driverId, reason = '') => {
    const cleanReason = String(reason || '').trim();
    const now = new Date();

    await Driver.collection.updateOne(
        { _id: toId(driverId) },
        {
            $set: {
                approved: false,
                applicationStatus: 'rejected',
                rejectionReason: cleanReason,
                updatedAt: now,
            },
            $unset: { resubmission: '' },
        }
    );

    // ---- Notification ----
    try {
        const driver = await Driver.findById(driverId).select('fcmToken').lean();
        if (driver?.fcmToken) {
            await sendNotification(driver.fcmToken, {
                driver: String(driverId),
                title: 'Application Update',
                body: cleanReason
                    ? `Your application was not approved. Reason: ${cleanReason}`
                    : 'Your application could not be approved. Please contact support for details.',
                type: 'application_rejected',
                screen: 'application_status',
            });
            console.log(`[REJECT] notification sent to driver ${driverId}`);
        } else {
            console.warn(`[REJECT] driver ${driverId} ka fcmToken nahi he, notification skip`);
        }
    } catch (error) {
        console.error('[REJECT] notification failed:', error.code || error.message);
    }
};

module.exports = {
    DOC_LABELS,
    DOC_FIELD_MAP,
    CONTACT_SUBJECTS,
    isPersonalComplete,
    isVehicleComplete,
    getApplicationStatus,
    getNextStep,
    buildApplicationInfo,
    buildStatusScreen,
    approveDriver,
    requestResubmission,
    rejectDriver,
};