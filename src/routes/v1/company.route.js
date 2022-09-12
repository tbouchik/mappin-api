const express = require('express');
const companyController = require('../../controllers/company.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router
  .route('/count')
  .get(auth('manageDocuments'), companyController.getCompanyCount)

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
