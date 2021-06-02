const express = require('express');
const validate = require('../../middlewares/validate');
const invoiceValidation = require('../../validations/invoice.validation');
const invoiceController = require('../../controllers/invoice.controller');
const invoiceSmelterController = require('../../controllers/invoiceSmelter.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

  router
    .route('/smelt')
    .post(auth('manageDocuments'), invoiceSmelterController.smelt);

  router
    .route('/')
    .post(auth('manageDocuments'), validate(invoiceValidation.createInvoice), invoiceController.createInvoice)
    .get(auth('manageDocuments'), validate(invoiceValidation.getInvoices), invoiceController.getInvoices);
    
  router
    .route('/:invoiceId')
    .get(auth('manageDocuments'), validate(invoiceValidation.getInvoice), invoiceController.getInvoice)
    .patch(auth('manageDocuments'), validate(invoiceValidation.updateInvoice), invoiceController.updateInvoice)
    .delete(auth('manageDocuments'), validate(invoiceValidation.deleteInvoice), invoiceController.deleteInvoice);
    

module.exports = router;
