const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const vendorValidation = require('../../validations/vendor.validation');
const vendorController = require('../../controllers/vendor.controller');

const router = express.Router();

router
  .route('/')
  .post(auth('manageDocuments'), validate(vendorValidation.createVendor), vendorController.createVendor)
  .get(auth('manageDocuments'), validate(vendorValidation.getVendors), vendorController.getVendors);

router
  .route('/:vendorId')
  .get(auth('manageDocuments'), validate(vendorValidation.getVendor), vendorController.getVendor)
  .patch(auth('manageDocuments'), validate(vendorValidation.updateVendor), vendorController.updateVendor)
  .delete(auth('manageDocuments'), validate(vendorValidation.deleteVendor), vendorController.deleteVendor);

module.exports = router;
