// const router = require('express').Router();

// const cmsController = require('../../controllers/user/cmsController');

// router.get('/terms', cmsController.getTerms);

// router.get('/faqs', cmsController.getFAQs);

// module.exports = router;


const router = require('express').Router();

const cmsController = require('../../controllers/user/cmsController');
const cancelReasonController = require('../../controllers/user/cancelReasonController');
const declarationFormController = require('../../controllers/user/declarationFormController');

router.get('/terms', cmsController.getTerms);

router.get('/faqs', cmsController.getFAQs);

// Dynamic Cancellation Policy — GET /api/cancel-reasons?type=rent|ride
router.get('/cancel-reasons', cancelReasonController.getCancelReasons);

// Dynamic Pickup/Return Declaration Form — GET /api/declaration-form?type=pickup|return
router.get('/declaration-form', declarationFormController.getDeclarationForm);

module.exports = router;