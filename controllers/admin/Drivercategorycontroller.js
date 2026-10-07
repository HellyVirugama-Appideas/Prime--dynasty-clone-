const deleteFile = require('../../utils/deleteFile');
const DriverCategory = require('../../models/driverCategoryModel');
const { ensureDefaults } = require('../../utils/driverCategory');

exports.getCategories = async (req, res) => {
    try {
        await ensureDefaults();
        const categories = await DriverCategory.find().sort('sortOrder createdAt');
        const edit = req.query.edit
            ? await DriverCategory.findById(req.query.edit).catch(() => null)
            : null;
        res.render('driver_category', { categories, edit });
    } catch (error) {
        req.flash('red', error.message);
        res.redirect('/admin');
    }
};

exports.postSaveCategory = async (req, res) => {
    try {
        const b = req.body;
        const data = {
            key: (b.key || '').toLowerCase().trim(),
            en: { name: b.nameEn },
            fr: { name: b.nameFr || b.nameEn },
            ar: { name: b.nameAr || b.nameEn },
            typeFor: b.typeFor,
            group: b.group || 'others',
            sortOrder: Number(b.sortOrder) || 0,
            isActive: b.isActive === 'on' || b.isActive === 'true',
        };

        if (b.id) {
            const cat = await DriverCategory.findById(b.id);
            if (!cat) {
                if (req.file) deleteFile(req.file.path);
                req.flash('red', 'Category not found!');
                return res.redirect('/admin/driver-category');
            }
            const oldImage = cat.image;
            // key is what drivers already store in useFor, so it is not editable
            delete data.key;
            cat.set(data);
            if (req.file) cat.image = `/uploads/${req.file.filename}`;
            await cat.save();
            if (req.file && oldImage) deleteFile(`public${oldImage}`);
            req.flash('green', 'Category updated.');
        } else {
            if (req.file) data.image = `/uploads/${req.file.filename}`;
            await DriverCategory.create(data);
            req.flash('green', 'Category added.');
        }
        res.redirect('/admin/driver-category');
    } catch (error) {
        if (req.file) deleteFile(req.file.path);
        req.flash('red', error.code === 11000 ? 'Key already exists.' : error.message);
        res.redirect('/admin/driver-category');
    }
};

exports.getToggleCategory = async (req, res) => {
    try {
        const cat = await DriverCategory.findById(req.params.id);
        if (cat) {
            cat.isActive = !cat.isActive;
            await cat.save();
            req.flash('green', `Category ${cat.isActive ? 'enabled' : 'disabled'}.`);
        }
    } catch (error) {
        req.flash('red', error.message);
    }
    res.redirect('/admin/driver-category');
};