const httpStatus = require('http-status');
const { pick } = require('lodash');
const AppError = require('../utils/AppError');
const { Filter, User } = require('../models');
const { getQueryOptions } = require('../utils/service.util');
const defaultFilter = require('../utils/defaultFilter');
const stdFilterFr = require('../utils/stdFilterFr');
let ObjectId = require('mongoose').Types.ObjectId;

const createFilter = async (user, filterBody) => {
  filterBody.user = user._id;
  filterBody.lastModifiedBy = user._id;
  const filter = await Filter.create(filterBody);
  return filter;
};

const createDefaultFilter = async userId => {
  const filterBodyFr = {
    user: userId,
    keys: stdFilterFr,
    description : "Template standard pour factures",
    isActiveDC : true,
    isActiveJournal : true,
    type : "invoice",
    name : "Template Standard",
  };
  const filter = await Filter.insertMany([filterBodyFr]);
  return filter;
};

const getFilters = async (user, query) => {
  const filter = {};
  const usersFromSameCompany = await User.find({company: user.company}).select({ "_id": 1}).exec();
  const usersIdsFromSameCompany = usersFromSameCompany.map(x => x._id)
  if (query.name) {
    filter.name = { $regex: `(?i)${query.name}` } 
  }
  if (query.type) {
    filter.type = query.type;
  }
  if(query.current) {
    let ObjectId = require('mongoose').Types.ObjectId;
    const idToExclude = new ObjectId(query.current);
    filter._id = { $ne: idToExclude };
  }
  filter.user = {$in: usersIdsFromSameCompany};
  const options = getQueryOptions(query);
  const filters = await Filter.find(filter, null, options).populate('lastModifiedBy', 'name');
  return filters;
};

const getFilterById = async (user, filterId, skipAuth = false) => {
  const filter = await Filter.findById(filterId);
  if (!filter) {
    throw new AppError(httpStatus.NOT_FOUND, 'Filter not found');
  } else if (!skipAuth) {
    if (parseInt(filter.user) !== parseInt(user._id)) {
      const filterCreator = await User.findById(filter.user);
      if (parseInt(filterCreator.company) !== parseInt(user.company)) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to access this filter information');
      }
    }
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
  updateBody.lastModifiedBy = user._id;
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
  let nameArray = ['Standard Template (EN)', 'Template Standard (FR)'];
  const filter = await Filter.find({ user: user._id, 'name': { $in: nameArray } })
  if (!filter) {
    throw new AppError(httpStatus.NOT_FOUND, 'Filter ID not found');
  }
  return filter._id;
};

const getDefaultFilter = async (user) => {
  let nameArray = ['Standard Template (EN)', 'Template Standard (FR)']
  const filter = await Filter.find({ user: user._id, 'name': { $in: nameArray } })
  if (!filter) {
    throw new AppError(httpStatus.NOT_FOUND, 'Filter ID not found');
  } else if (parseInt(filter.user) !== parseInt(user._id)) {
    const filterCreator = await User.findById(filter.user)
    if (parseInt(filterCreator.company) !== parseInt(user.company)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to access this filter information');
    }
  }
  return filter;
};

const getManyFiltersInternal = async (filterIds) => {
  const idArray = filterIds.map((filterId) => new ObjectId(filterId))
  const filters = await Filter.find({'_id': { $in: idArray }});
  return filters

}

module.exports = {
  createFilter,
  createDefaultFilter,
  getFilters,
  getFilterById,
  getFilterByName,
  updateFilter,
  deleteFilter,
  getDefaultFilterId,
  getDefaultFilter,
  getManyFiltersInternal,
};
