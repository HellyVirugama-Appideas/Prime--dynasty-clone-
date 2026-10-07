const DEFAULT_CLAUSES = [
    'Lorem ipsum is simply dummy text printing.',
    'It is a long established fact that a reader.',
    'The point of using Lorem Ipsum is that it has.',
    'Many desktop publishing packages and web.',
    'There are many variations of passages of lorem.',
    'Lorem ipsum is simply dummy text of the printing.',
    'When an unknown printer took a galley of type and scrambled it to make a specimen book.',
].map((text, idx) => ({ text, order: idx }));

const DEFAULTS = {
    pickup: { title: 'Pickup declaration form', clauses: DEFAULT_CLAUSES },
    return: { title: 'Return declaration form', clauses: DEFAULT_CLAUSES },
};

/**
 * Fetches the declaration form for the given stage ('pickup' | 'return'),
 * auto-creating it with sensible defaults the first time so the app never
 * breaks on a fresh install and admin always has something to edit.
 */
async function getOrCreateDeclarationForm(DeclarationForm, type) {
    let form = await DeclarationForm.findOne({ type });
    if (!form) {
        const seed = DEFAULTS[type] || { title: `${type} declaration form`, clauses: [] };
        form = await DeclarationForm.create({
            type,
            title: seed.title,
            clauses: seed.clauses,
            isActive: true,
        });
    }
    return form;
}

module.exports = { getOrCreateDeclarationForm, DEFAULTS };