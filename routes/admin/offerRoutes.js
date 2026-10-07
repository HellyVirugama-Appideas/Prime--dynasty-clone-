const router = require('express').Router();
const fileUpload = require('express-fileupload');
const offerController = require('../../controllers/admin/offerController');

router.get('/offers', offerController.listOffers);
router.get('/offers/add', offerController.addOfferForm);
router.post('/offers/add', fileUpload(), offerController.createOffer);
router.get('/offers/edit/:id', offerController.editOfferForm);
router.post('/offers/edit/:id', fileUpload(), offerController.updateOffer);
router.post('/offers/toggle/:id', offerController.toggleOfferStatus);
router.post('/offers/delete/:id', offerController.deleteOffer);

module.exports = router;