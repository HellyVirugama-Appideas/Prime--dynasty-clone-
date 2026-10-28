const Message = require('../models/messageModel.js');
const Page = require('../models/pageModel');

exports.home = (req, res) => {
    let language;
    if (req.cookies.language) {
        if (req.cookies.language == 'en') language = 'en';
        else if (req.cookies.language == 'fr') language = 'fr';
    } else if (req.headers['accept-language']?.startsWith('en')) {
        res.cookie('language', 'en');
        language = 'en';
    }

    if (language == 'en') res.render('landing/landing_eng');
    else res.render('landing/landing');
};

exports.fr = (req, res) => {
    res.cookie('language', 'fr');
    res.redirect('/');
};

exports.en = (req, res) => {
    res.cookie('language', 'en');
    res.redirect('/');
};

// Admin panel (CMS) ka content landing page par dikhane ke liye
// language: cookie 'en' => English, warna French (landing ka default French hai)
const renderCmsPage = (title, viewEn, viewFr) => async (req, res) => {
    try {
        const isEn = req.cookies.language == 'en';
        const page = await Page.findOne({ title }).lean();
        const content = (isEn ? page?.en?.content : page?.fr?.content) || '';

        res.render(isEn ? viewEn : viewFr, { content });
    } catch (error) {
        console.log(error);
        res.render(req.cookies.language == 'en' ? viewEn : viewFr, { content: '' });
    }
};

exports.privacy = renderCmsPage('privacy', 'landing/privacy_eng', 'landing/privacy');
exports.terms = renderCmsPage('terms', 'landing/terms_eng', 'landing/terms');

exports.contact = async (req, res) => {
    try {
        await Message.create(req.body);

        // message per language
        if (req.cookies.language == 'en')
            res.send('Message sent successfully.');
        else res.send('Message envoyé avec succès.');
    } catch (error) {
        console.log(error);
        res.send('Oops! An error occured and your message could not be sent.');
    }
};