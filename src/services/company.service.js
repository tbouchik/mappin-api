const httpStatus = require('http-status');
const { pick } = require('lodash');
const AppError = require('../utils/AppError');
const { Company } = require('../models');
const { getQueryOptions } = require('../utils/service.util');

const checkDuplicateCompanyName = async (name, excludeCompanyId) => {
  const company = await Company.findOne({ name, _id: { $ne: excludeCompanyId } });
  if (company) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Company name already taken');
  }
};

const createCompany = async companyBody => {
  await checkDuplicateCompanyName(companyBody.name);
  const company = await Company.create(companyBody);
  return company;
};

const getCompanies = async query => {
  const filter = pick(query, ['name']);
  const options = getQueryOptions(query);
  const companies = await Company.find(filter, null, options);
  return companies;
};

const getCompanyById = async companyId => {
  const company = await Company.findById(companyId);
  if (!company) {
    throw new AppError(httpStatus.NOT_FOUND, 'Company not found');
  }
  return company;
};

const getCompanyByCompanyName = async name => {
  const company = await Company.findOne({ name });
  if (!company) {
    throw new AppError(httpStatus.NOT_FOUND, 'No company found with this name');
  }
  return company;
};

const updateCompany = async (companyId, updateBody) => {
  const company = await getCompanyById(companyId);
  if (updateBody.name) {
    await checkDuplicateCompanyName(updateBody.name, companyId);
  }
  Object.assign(company, updateBody);
  await company.save();
  return company;
};

const deleteCompany = async companyId => {
  const company = await getCompanyById(companyId);
  await company.remove();
  return company;
};

module.exports = {
  createCompany,
  getCompanies,
  getCompanyById,
  getCompanyByCompanyName,
  updateCompany,
  deleteCompany,
};
