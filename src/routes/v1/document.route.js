const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const documentValidation = require('../../validations/document.validation');
const documentController = require('../../controllers/document.controller');

const router = express.Router();

  router
    .route('/export/')
    .get(auth('manageDocuments'), validate(documentValidation.exportBulkCSV), documentController.exportBulkCSV);

  router
    .route('/next/')
    .get(auth('manageDocuments'), validate(documentValidation.getNextDocumentIds), documentController.getNextDocumentIds);

  router
    .route('/nextsmelted/')
    .get(auth('manageDocuments'), validate(documentValidation.getNextSmeltedDocumentIds), documentController.getNextSmeltedDocumentIds);

  router
    .route('/count/')
    .get(auth('manageDocuments'), validate(documentValidation.getDocuments), documentController.getDocumentsCount);

  router
    .route('/')
    .post(auth('manageDocuments'), validate(documentValidation.createDocument), documentController.createDocument)
    .get(auth('manageDocuments'), validate(documentValidation.getDocuments), documentController.getDocuments);
    
  router
    .route('/:documentId')
    .get(auth('manageDocuments'), validate(documentValidation.getDocument), documentController.getDocument)
    .patch(auth('manageDocuments'), validate(documentValidation.updateDocument), documentController.updateDocument)
    .delete(auth('manageDocuments'), validate(documentValidation.deleteDocument), documentController.deleteDocument);
    

module.exports = router;
