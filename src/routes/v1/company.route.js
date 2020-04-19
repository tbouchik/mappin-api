const express = require('express');
const companyController = require('../../controllers/company.controller');

const router = express.Router();

router
  .route('/')
  .post(companyController.createCompany)
  .get(companyController.getCompanies);

router
  .route('/:companyId')
  .get(companyController.getCompany)
  .patch(companyController.updateCompany)
  .delete(companyController.deleteCompany);

module.exports = router;
