const httpStatus = require('http-status');
const { pick } = require('lodash');
const AppError = require('../utils/AppError');
const { User, Company, Client } = require('../models');
const { getQueryOptions } = require('../utils/service.util');
const { createCompany } = require('./company.service');

const checkDuplicateEmail = async (email, excludeUserId) => {
  const usedForbiddenEmail = email === process.env.GENERIC_EMAIL;
  const client = await Client.findOne({ email });
  const user = await User.findOne({ email, _id: { $ne: excludeUserId } });
  if (user || client || usedForbiddenEmail) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
};

const checkUserExists = async email => {
  // Created for auth.controller.login
  const user = await User.findOne({ email });
  if (user) {
    return true;
  }
  return false;
};

const checkCompanyExists = async companyName => {
  const company = await Company.findOne({ name: companyName });
  if (!company) {
    const newCompany = await createCompany({ name: companyName });
    return newCompany;
  }
  return company;
};

const createUser = async userBody => {
  await checkDuplicateEmail(userBody.email);
  company = await checkCompanyExists(userBody.company);
  userBody.company = company._id;
  const user = await User.create(userBody);
  return user;
};

const getUsers = async (user, query) => {
  const filter = pick(query, ['name']);
  if (user.role !== 'admin') {
    throw new AppError(httpStatus.FORBIDDEN, 'Not Authorised');
  }
  filter.company = user.company;
  const options = getQueryOptions(query);
  const users = await User.find(filter, null, options);
  return users;
};

const getUserById = async (user, searchedUserId) => {
  if (user.role !== 'admin') {
    throw new AppError(httpStatus.FORBIDDEN, 'Not Authorised');
  }
  const searchedUser = await User.findById(searchedUserId).populate('subscription', 'credits');
  if (!searchedUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (searchedUser && searchedUser.company !== user.company) {
    throw new AppError(httpStatus.FORBIDDEN, 'Not Authorised');
  }
  return searchedUser;
};

const getUserByEmail = async email => {
  const user = await User.findOne({ email }).populate('subscription', 'credits');
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'No user found with this email');
  }
  return user;
};

const updateUser = async (user, searchedUserId, updateBody) => {
  if (user.role !== 'admin') {
    throw new AppError(httpStatus.FORBIDDEN, 'Not Authorised');
  }
  const searchedUser = await getUserById(searchedUserId);
  if (searchedUser &&( (searchedUser.company !== user.company)|| (searchedUser.role === 'admin'))) {
    throw new AppError(httpStatus.FORBIDDEN, 'Not Authorised');
  }
  if (updateBody.email) {
    await checkDuplicateEmail(updateBody.email, searchedUserId);
  }
  Object.assign(searchedUser, updateBody);
  await searchedUser.save();
  return searchedUser;
};

const updateUserCounter = async (user, searchedUserId, updateBody) => {
  if (user.role !== 'admin') {
    throw new AppError(httpStatus.FORBIDDEN, 'Not Authorised');
  }
  const searchedUser = await getUserById(searchedUserId);
  if (searchedUser &&( (searchedUser.company !== user.company)|| (searchedUser.role === 'admin'))) {
    throw new AppError(httpStatus.FORBIDDEN, 'Not Authorised');
  }
  if (updateBody.email) {
    await checkDuplicateEmail(updateBody.email, searchedUserId);
  }
  updateBody.counter = searchedUser.counter? updateBody.counter + searchedUser.counter : updateBody.counter
  Object.assign(searchedUser, updateBody);
  await searchedUser.save();
  return searchedUser;
};

const userCreditsRemaining = async (userId) => {
  const user = await getUserById(userId);
  return user.subscription.credits - user.counter
}

const deleteUser = async (user, searchedUserId) => {
  if (user.role !== 'admin') {
    throw new AppError(httpStatus.FORBIDDEN, 'Not Authorised');
  }
  const searchedUser = await getUserById(searchedUserId);
  if (searchedUser &&((searchedUser.company !== user.company)|| (searchedUser.role === 'admin'))) {
    throw new AppError(httpStatus.FORBIDDEN, 'Not Authorised');
  }
  await searchedUser.remove();
  return searchedUser;
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
  checkUserExists,
  updateUserCounter,
  userCreditsRemaining,
};
