const httpStatus = require('http-status');
const AppError = require('../utils/AppError');
const { Vendor } = require('../models');
const { pick } = require('lodash');
const { compareStringsSimilitude } = require('../utils/tinder')

const createVendor = async (user, vendorBody) => {
  vendorBody.user = user._id;
  vendorBody.lastModifiedBy = user._id;
  const vendor = await Vendor.create(vendorBody);
  return vendor;
};

const getVendors = async (user, query) => {
  let vendor = {};
  if (query.name) {
    vendor.name = { $regex: `(?i)${query.name}` } 
  }
  if (query.code) {
    vendor.code = { $regex: `(?i)${query.code}` };
  }
  if (query.confirmed) {
    vendor.confirmed = query.confirmed;
  }
  if(query.current) {
    let ObjectId = require('mongoose').Types.ObjectId;
    const idToExclude = new ObjectId(query.current)
    vendor._id = { $ne: idToExclude }
  }
  vendor.user = user._id;
  const options = pick(query, ['page', 'limit']);
  options.populate = [{path:'lastModifiedBy', select:'name'}]
  const vendors = await Vendor.paginate(vendor, options);
  return vendors;
};

getSimilarVendor = async (user, name) =>{
  let query = {user: user._id}
  const vendors = await Vendor.find(query, null);
  let foundMatch = false;
  let candidate = null;
  let index = 0;
  while(!foundMatch && index < vendors.length) {
    candidate = vendors[index];
    foundMatch = vendorsMatch(name, candidate.name);
    index++;
  }
  return foundMatch === true? candidate : null;
}

vendorsMatch = (name1, name2) =>{
  let score = compareStringsSimilitude(name1, name2)
  return score > 90
}

const getVendorById = async (user, vendorId, skipAuth = false) => {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  } else if (parseInt(vendor.user) !== parseInt(user._id) && !skipAuth) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to access this vendor information');
  }
  return vendor;
};

const updateVendor = async (user, vendorId, updateBody) => {
  const vendor = await getVendorById(user, vendorId);
  updateBody.lastModifiedBy = user._id;
  Object.assign(vendor, updateBody);
  await vendor.save();
  return vendor;
};

const deleteVendor = async (user, vendorId) => {
  const vendor = await getVendorById(user, vendorId);
  await vendor.remove();
  return vendor;
};

module.exports = {
  createVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  getSimilarVendor
};
