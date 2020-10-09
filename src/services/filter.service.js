const httpStatus = require('http-status');
const { pick } = require('lodash');
const AppError = require('../utils/AppError');
const { Filter } = require('../models');
const { getQueryOptions } = require('../utils/service.util');
const defaultFilter = require('../utils/defaultFilter');

const checkDuplicateName = async (name, excludeFilterId) => {
  const filter = await Filter.findOne({ name, _id: { $ne: excludeFilterId } });
  if (filter) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Name already taken');
  }
};

const createFilter = async (user, filterBody) => {
  await checkDuplicateName(filterBody.name);
  filterBody.user = user._id;
  const filter = await Filter.create(filterBody);
  return filter;
};

const createDefaultFilter = async userId => {
  const filterBody = {
    user: userId,
    keys: defaultFilter,
    name: 'Smart Template',
  };
  const filter = await Filter.create(filterBody);
  return filter;
};

const getFilters = async (user, query) => {
  const filter = pick(query, ['name']);
  filter.user = user._id;
  const options = getQueryOptions(query);
  const filters = await Filter.find(filter, null, options);
  return filters;
};

const getFilterById = async (user, filterId) => {
  const filter = await Filter.findById(filterId);
  if (!filter) {
    throw new AppError(httpStatus.NOT_FOUND, 'Filter not found');
  } else if (parseInt(filter.user) !== parseInt(user._id)) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to access this filter information');
  }
  return filter;
};

const getFilterByName = async name => {
  const filter = await Filter.findOne({ name });
  if (!filter) {
    throw new AppError(httpStatus.NOT_FOUND, 'No filter found with this name');
  }
  return filter;
};

const updateFilter = async (user, filterId, updateBody) => {
  const filter = await getFilterById(user, filterId);
  if (updateBody.name) {
    await checkDuplicateName(updateBody.name, filterId);
  }
  Object.assign(filter, updateBody);
  await filter.save();
  return filter;
};

const deleteFilter = async (user, filterId) => {
  const filter = await getFilterById(user, filterId);
  await filter.remove();
  return filter;
};

const getDefaultFilterId = async (user) => {
  const filter = await Filter.findOne({ user: user._id })
  if (!filter) {
    throw new AppError(httpStatus.NOT_FOUND, 'Filter ID not found');
  } else if (parseInt(filter.user) !== parseInt(user._id)) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to access this filter information');
  }
  return filter._id;
};

module.exports = {
  createFilter,
  createDefaultFilter,
  getFilters,
  getFilterById,
  getFilterByName,
  updateFilter,
  deleteFilter,
  getDefaultFilterId,
};
