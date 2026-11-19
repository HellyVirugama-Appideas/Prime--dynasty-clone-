const SupportMessage = require('../../models/supportMessageModel');
const { CONTACT_SUBJECTS, getApplicationStatus } = require('../../utils/driverApplication');

const PAGE_SIZE = 15;
const escapeRegex = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /admin/support-messages
exports.list = async (req, res) => {
    try {
        const status = ['open', 'resolved'].includes(req.query.status) ? req.query.status : 'all';
        const subject = CONTACT_SUBJECTS.includes(req.query.subject) ? req.query.subject : '';
        const search = String(req.query.search || '').trim();
        const page = Math.max(parseInt(req.query.page) || 1, 1);

        const query = {};
        if (status !== 'all') query.status = status;
        if (subject) query.subject = subject;
        if (search) {
            const rx = new RegExp(escapeRegex(search), 'i');
            query.$or = [{ name: rx }, { message: rx }, { customSubject: rx }];
        }

        const [messages, total, openCount, resolvedCount] = await Promise.all([
            SupportMessage.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * PAGE_SIZE)
                .limit(PAGE_SIZE)
                .populate('driver', 'name phone email approved applicationStatus')
                .lean(),
            SupportMessage.countDocuments(query),
            SupportMessage.countDocuments({ status: 'open' }),
            SupportMessage.countDocuments({ status: 'resolved' }),
        ]);

        res.render('support_messages', {
            supportMessages: messages.map(m => ({
                ...m,
                driverStatus: m.driver ? getApplicationStatus(m.driver) : null,
            })),
            subjects: CONTACT_SUBJECTS,
            counts: { all: openCount + resolvedCount, open: openCount, resolved: resolvedCount },
            status,
            subject,
            search,
            page,
            totalPages: Math.max(Math.ceil(total / PAGE_SIZE), 1),
            active: 'support-messages',
            title: 'Support Messages',
            url: req.originalUrl,
        });
    } catch (error) {
        console.error('Support messages list error:', error);
        req.flash('error', error.message);
        res.redirect('/admin');
    }
};

// POST /admin/support-messages/:id/toggle   (open <-> resolved)
exports.toggle = async (req, res) => {
    try {
        const msg = await SupportMessage.findById(req.params.id);
        if (!msg) throw new Error('Message not found');

        msg.status = msg.status === 'open' ? 'resolved' : 'open';
        await msg.save();

        req.flash('success', `Message marked as ${msg.status}`);
    } catch (error) {
        req.flash('error', error.message);
    }
    res.redirect(req.get('referer') || '/admin/support-messages');
};