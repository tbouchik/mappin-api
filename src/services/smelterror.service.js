const httpStatus = require('http-status');
const AppError = require('../utils/AppError');
const { SmeltError, Document } = require('../models');
let ObjectId = require('mongoose').Types.ObjectId;
const status = require('./../enums/status');

const createSmeltError = async (user, smeltErrorBody) => {
  smeltErrorBody.user = user._id;
  const document = await Document.findById(smeltErrorBody.document);
  document.status = status.ERROR;
  document.save();
  const smeltError = await SmeltError.create(smeltErrorBody);
  return smeltError;
};

const getSmeltErrorById = async (user, smeltErrorId, skipAuth = false) => {
  const smeltError = await SmeltError.findById(smeltErrorId);
  if (!smeltError) {
    throw new AppError(httpStatus.NOT_FOUND, 'SmeltError not found');
  } else if (parseInt(smeltError.user) !== parseInt(user._id) && !skipAuth) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to access this smeltError information');
  }
  return smeltError;
};

const updateSmeltError = async (user, smeltErrorId, updateBody) => {
  const smeltError = await getSmeltErrorById(user, smeltErrorId);
  Object.assign(smeltError, updateBody);
  await smeltError.save();
  return smeltError;
};

const deleteSmeltError = async (user, smeltErrorId) => {
  const smeltError = await getSmeltErrorById(user, smeltErrorId);
  await smeltError.remove();
  return smeltError;
};

const getManySmeltErrorsInternal = async (smeltErrorIds) => {
  const idArray = smeltErrorIds.map((smeltErrorId) => new ObjectId(smeltErrorId))
  const smeltErrors = await SmeltError.find({'_id': { $in: idArray }});
  return smeltErrors
}

module.exports = {
  createSmeltError,
  getSmeltErrorById,
  updateSmeltError,
  deleteSmeltError,
  getManySmeltErrorsInternal,
};
