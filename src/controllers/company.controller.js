const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { companyService } = require('../services');

const createCompany = catchAsync(async (req, res) => {
  const company = await companyService.createCompany(req.body);
  res.status(httpStatus.CREATED).send(company.transform());
});

const getCompanies = catchAsync(async (req, res) => {
  const companies = await companyService.getCompanies(req.query);
  const response = companies.map(company => company.transform());
  res.send(response);
});

const getCompanyCount = catchAsync(async (req, res) => {
  const credits = await companyService.companyCreditsRemaining(req.user.company);
  const response = {credits};
  res.send(response);
});

const getCompany = catchAsync(async (req, res) => {
  const company = await companyService.getCompanyById(req.params.companyId);
  res.send(company.transform());
});

const updateCompany = catchAsync(async (req, res) => {
  const company = await companyService.updateCompany(req.params.companyId, req.body);
  res.send(company.transform());
});

const deleteCompany = catchAsync(async (req, res) => {
  await companyService.deleteCompany(req.params.companyId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createCompany,
  getCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
  getCompanyCount,
};
