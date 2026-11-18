const OnboardingScreen = require('../models/onboardingScreenModel');

// GET /api/user/onboarding-screens  aur  GET /api/driver/onboarding-screens
exports.getOnboardingScreens = async (req, res, next) => {
    try {
        const screens = await OnboardingScreen.find({ isActive: true })
            .sort({ order: 1, createdAt: 1 })
            .select('title description image order')
            .lean();

        res.json({
            code: '1',
            message: req.t('success'),
            total: screens.length,
            screens: screens.map((s, index) => ({
                id: s._id,
                title: s.title,
                description: s.description,
                image: s.image, // relative path, baaki APIs jaisa (/uploads/...)
                order: s.order,
                position: index + 1,
                isLast: index === screens.length - 1,
            })),
        });
    } catch (error) {
        console.error('getOnboardingScreens error:', error);
        next(error);
    }
};