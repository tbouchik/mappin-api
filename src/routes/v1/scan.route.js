const express = require('express');
const auth = require('../../middlewares/auth');
const scanController = require('../../controllers/scan.controller');

const router = express.Router();

router
  .route('/')
  .post(auth('manageDocuments'), scanController.scanDocument);


module.exports = router;