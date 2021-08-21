const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { smeltErrorService } = require('../services');

const createSmeltError = catchAsync(async (req, res) => {
  const smeltError = await smeltErrorService.createSmeltError(req.user, req.body);
  res.status(httpStatus.CREATED).send(smeltError.transform());
});

const getSmeltError = catchAsync(async (req, res) => {
  const smeltError = await smeltErrorService.getSmeltErrorById(req.user, req.params.smeltErrorId);
  res.send(smeltError.transform());
});

const updateSmeltError = catchAsync(async (req, res) => {
  const smeltError = await smeltErrorService.updateSmeltError(req.user, req.params.smeltErrorId, req.body);
  res.send(smeltError.transform());
});

const deleteSmeltError = catchAsync(async (req, res) => {
  await smeltErrorService.deleteSmeltError(req.user, req.params.smeltErrorId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createSmeltError,
  getSmeltError,
  updateSmeltError,
  deleteSmeltError,
};
