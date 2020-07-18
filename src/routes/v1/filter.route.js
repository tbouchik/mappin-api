const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const filterValidation = require('../../validations/filter.validation');
const filterController = require('../../controllers/filter.controller');

const router = express.Router();

router
  .route('/')
  .post(auth('manageFilters'), validate(filterValidation.createFilter), filterController.createFilter)
  .get(auth('manageFilters'), validate(filterValidation.getFilters), filterController.getFilters);

router
  .route('/:filterId')
  .get(auth('manageFilters'), validate(filterValidation.getFilter), filterController.getFilter)
  .patch(auth('manageFilters'), validate(filterValidation.updateFilter), filterController.updateFilter)
  .delete(auth('manageFilters'), validate(filterValidation.deleteFilter), filterController.deleteFilter);

module.exports = router;
