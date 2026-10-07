const router = require('express').Router();

const declarationFormController = require('../../controllers/admin/declarationFormController');
const authController = require('../../controllers/admin/authController');

router.use(authController.checkAdmin);

router.get('/declaration-forms', declarationFormController.getDeclarationForms);
router.post('/declaration-forms/:type', declarationFormController.saveDeclarationForm);

module.exports = router;