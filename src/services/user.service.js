const httpStatus = require('http-status');
const { pick } = require('lodash');
const AppError = require('../utils/AppError');
const { User, Company, Client } = require('../models');
const { getQueryOptions } = require('../utils/service.util');

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
    throw new AppError(httpStatus.BAD_REQUEST, 'Company does not exist');
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

const getUsers = async query => {
  const filter = pick(query, ['name', 'role', 'company']);
  const options = getQueryOptions(query);
  const users = await User.find(filter, null, options);
  return users;
};

const getUserById = async userId => {
  const user = await User.findById(userId).populate('subscription');
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  return user;
};

const getUserByEmail = async email => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'No user found with this email');
  }
  return user;
};

const updateUser = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (updateBody.email) {
    await checkDuplicateEmail(updateBody.email, userId);
  }
  Object.assign(user, updateBody);
  await user.save();
  return user;
};

const updateUserCounter = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (updateBody.email) {
    await checkDuplicateEmail(updateBody.email, userId);
  }
  updateBody.counter = user.counter? updateBody.counter + user.counter : updateBody.counter
  Object.assign(user, updateBody);
  await user.save();
  return user;
};

const userCreditsRemaining = async (userId) => {
  const user = await getUserById(userId);
  return user.subscription.credits - user.counter
}

const deleteUser = async userId => {
  const user = await getUserById(userId);
  await user.remove();
  return user;
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
