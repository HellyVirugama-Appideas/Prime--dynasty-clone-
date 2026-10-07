const DeclarationForm = require('../../models/declarationFormModel');
const { getOrCreateDeclarationForm } = require('../../utils/declarationFormDefaults');

// GET - Declaration Forms Page (both Pickup & Return, side by side)
exports.getDeclarationForms = async (req, res) => {
    try {
        const [pickupForm, returnForm] = await Promise.all([
            getOrCreateDeclarationForm(DeclarationForm, 'pickup'),
            getOrCreateDeclarationForm(DeclarationForm, 'return'),
        ]);

        res.render('declarationForms', {
            title: 'Declaration Forms',
            pickupForm,
            returnForm,
        });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin');
    }
};

// POST - Save one stage's declaration form (title + clauses)
// :type is 'pickup' or 'return'
exports.saveDeclarationForm = async (req, res) => {
    try {
        const { type } = req.params;
        if (!['pickup', 'return'].includes(type)) {
            req.flash('red', 'Invalid declaration form type.');
            return res.redirect('/admin/declaration-forms');
        }

        const { title, clauseText } = req.body;

        if (!title || !title.trim()) {
            req.flash('red', 'Form title is required.');
            return res.redirect('/admin/declaration-forms');
        }

        // Rebuild ordered clauses from the repeated "clauseText" fields
        const clauseTextArr = [].concat(clauseText || []);
        const clauses = clauseTextArr
            .map((text, idx) => ({ text: (text || '').trim(), order: idx }))
            .filter((c) => c.text);

        await DeclarationForm.findOneAndUpdate(
            { type },
            {
                $set: {
                    title: title.trim(),
                    clauses,
                    isActive: true,
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        req.flash('green', `${type === 'pickup' ? 'Pickup' : 'Return'} declaration form updated successfully.`);
        res.redirect('/admin/declaration-forms');
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin/declaration-forms');
    }
};