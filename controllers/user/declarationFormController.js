const DeclarationForm = require('../../models/declarationFormModel');
const { getOrCreateDeclarationForm } = require('../../utils/declarationFormDefaults');

// GET /api/declaration-form?type=pickup|return
// Public (no auth needed) — powers screens "14-sign1" / "14-sign3".
exports.getDeclarationForm = async (req, res, next) => {
    try {
        const type = req.query.type === 'return' ? 'return' : 'pickup'; // default: pickup

        const form = await getOrCreateDeclarationForm(DeclarationForm, type);

        const clauses = [...form.clauses]
            .sort((a, b) => a.order - b.order)
            .map((c, idx) => ({ number: idx + 1, text: c.text }));

        res.json({
            code: '1',
            message: 'Declaration form fetched successfully',
            data: {
                type,
                title: form.title,
                clauses,
            },
        });
    } catch (error) {
        next(error);
    }
};