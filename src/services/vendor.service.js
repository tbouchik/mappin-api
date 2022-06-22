const httpStatus = require('http-status');
const { pick } = require('lodash');
const AppError = require('../utils/AppError');
const { Vendor } = require('../models');
const { getQueryOptions } = require('../utils/service.util');

const createVendor = async (user, vendorBody) => {
  vendorBody.user = user._id;
  const vendor = await Vendor.create(vendorBody);
  return vendor;
};

const getVendors = async (user, query) => {
  const vendor = {};
  if (query.name) {
    vendor.name = { $regex: `(?i)${query.name}` } 
  }
  if (query.code) {
    vendor.code = { $regex: `(?i)${query.code}` };
  }
  if(query.current) {
    let ObjectId = require('mongoose').Types.ObjectId;
    const idToExclude = new ObjectId(query.current)
    vendor._id = { $ne: idToExclude }
  }
  vendor.user = user._id;
  const options = getQueryOptions(query);
  const vendors = await Vendor.find(vendor, null, options);
  return vendors;
};

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
};
