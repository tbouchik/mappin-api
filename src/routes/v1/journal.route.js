const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const journalValidation = require('../../validations/journal.validation');
const journalController = require('../../controllers/journal.controller');

const router = express.Router();

router
  .route('/default')
  .post(auth('manageDocuments'), validate(journalValidation.makeDefault), journalController.makeDefaultJournal)

router
  .route('/')
  .post(auth('manageDocuments'), validate(journalValidation.createJournal), journalController.createJournal)
  .get(auth('manageDocuments'), validate(journalValidation.getJournals), journalController.getJournals);

router
  .route('/:journalId')
  .get(auth('manageDocuments'), validate(journalValidation.getJournal), journalController.getJournal)
  .patch(auth('manageDocuments'), validate(journalValidation.updateJournal), journalController.updateJournal)
  .delete(auth('manageDocuments'), validate(journalValidation.deleteJournal), journalController.deleteJournal);

module.exports = router;
