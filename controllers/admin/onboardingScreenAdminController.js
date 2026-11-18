const fs = require('fs');
const path = require('path');
const OnboardingScreen = require('../../models/onboardingScreenModel');

// Purani image delete (file na mile to bhi error nahi)
const removeImage = relativePath => {
    if (!relativePath) return;
    const fullPath = path.join(__dirname, '../../public', relativePath);
    fs.unlink(fullPath, err => {
        if (err && err.code !== 'ENOENT') console.log('Image delete error:', err.message);
    });
};

// GET /admin/onboarding-screens
exports.list = async (req, res) => {
    try {
        const screens = await OnboardingScreen.find().sort({ order: 1, createdAt: 1 }).lean();

        res.render('onboarding_list', {
            screens,
            active: 'onboarding-screens',
            title: 'Onboarding Screens',
            url: req.originalUrl,
        });
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/admin');
    }
};

// GET /admin/onboarding-screens/add
exports.getAdd = async (req, res) => {
    try {
        const last = await OnboardingScreen.findOne().sort({ order: -1 }).select('order').lean();

        res.render('onboarding_form', {
            screen: { title: '', description: '', order: (last?.order || 0) + 1, isActive: true },
            isEdit: false,
            active: 'onboarding-screens',
            title: 'Add Onboarding Screen',
            url: req.originalUrl,
        });
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/admin/onboarding-screens');
    }
};

// POST /admin/onboarding-screens/add
exports.postAdd = async (req, res) => {
    const uploadedImage = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        const title = String(req.body.title || '').trim();

        if (!title) throw new Error('Title is required');
        if (!uploadedImage) throw new Error('Image is required');

        await OnboardingScreen.create({
            title,
            description: String(req.body.description || '').trim(),
            image: uploadedImage,
            order: Number(req.body.order) || 0,
            isActive: req.body.isActive === 'on' || req.body.isActive === 'true',
        });

        req.flash('success', 'Onboarding screen added successfully');
        res.redirect('/admin/onboarding-screens');
    } catch (error) {
        removeImage(uploadedImage); // save fail hua to nayi image hata do
        req.flash('error', error.message);
        res.redirect('/admin/onboarding-screens/add');
    }
};

// GET /admin/onboarding-screens/edit/:id
exports.getEdit = async (req, res) => {
    try {
        const screen = await OnboardingScreen.findById(req.params.id).lean();
        if (!screen) throw new Error('Onboarding screen not found');

        res.render('onboarding_form', {
            screen,
            isEdit: true,
            active: 'onboarding-screens',
            title: 'Edit Onboarding Screen',
            url: req.originalUrl,
        });
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/admin/onboarding-screens');
    }
};

// POST /admin/onboarding-screens/edit/:id
exports.postEdit = async (req, res) => {
    const uploadedImage = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        const screen = await OnboardingScreen.findById(req.params.id);
        if (!screen) throw new Error('Onboarding screen not found');

        const title = String(req.body.title || '').trim();
        if (!title) throw new Error('Title is required');

        const oldImage = screen.image;

        screen.title = title;
        screen.description = String(req.body.description || '').trim();
        screen.order = Number(req.body.order) || 0;
        screen.isActive = req.body.isActive === 'on' || req.body.isActive === 'true';
        if (uploadedImage) screen.image = uploadedImage;

        await screen.save();

        if (uploadedImage) removeImage(oldImage); // nayi image aayi to purani hata do

        req.flash('success', 'Onboarding screen updated successfully');
        res.redirect('/admin/onboarding-screens');
    } catch (error) {
        removeImage(uploadedImage);
        req.flash('error', error.message);
        res.redirect(`/admin/onboarding-screens/edit/${req.params.id}`);
    }
};

// POST /admin/onboarding-screens/toggle/:id
exports.toggleStatus = async (req, res) => {
    try {
        const screen = await OnboardingScreen.findById(req.params.id);
        if (!screen) throw new Error('Onboarding screen not found');

        screen.isActive = !screen.isActive;
        await screen.save();

        req.flash('success', `Screen ${screen.isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
        req.flash('error', error.message);
    }
    res.redirect('/admin/onboarding-screens');
};

// POST /admin/onboarding-screens/delete/:id
exports.remove = async (req, res) => {
    try {
        const screen = await OnboardingScreen.findByIdAndDelete(req.params.id);
        if (!screen) throw new Error('Onboarding screen not found');

        removeImage(screen.image);
        req.flash('success', 'Onboarding screen deleted successfully');
    } catch (error) {
        req.flash('error', error.message);
    }
    res.redirect('/admin/onboarding-screens');
};