const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { filterService } = require('../services');

const createFilter = catchAsync(async (req, res) => {
  const filter = await filterService.createFilter(req.user, req.body);
  res.status(httpStatus.CREATED).send(filter.transform());
});

const getFilters = catchAsync(async (req, res) => {
  const filters = await filterService.getFilters(req.user, req.query);
  const response = filters.map(filter => filter.transform());
  res.send(response);
});

const getFilter = catchAsync(async (req, res) => {
  const filter = await filterService.getFilterById(req.user, req.params.filterId);
  res.send(filter.transform());
});

const updateFilter = catchAsync(async (req, res) => {
  const filter = await filterService.updateFilter(req.user, req.params.filterId, req.body);
  res.send(filter.transform());
});

const deleteFilter = catchAsync(async (req, res) => {
  await filterService.deleteFilter(req.user, req.params.filterId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createFilter,
  getFilters,
  getFilter,
  updateFilter,
  deleteFilter,
};
