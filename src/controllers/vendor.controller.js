const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { vendorService } = require('../services');

const createVendor = catchAsync(async (req, res) => {
  const vendor = await vendorService.createVendor(req.user, req.body);
  res.status(httpStatus.CREATED).send(vendor.transform());
});

const getVendors = catchAsync(async (req, res) => {
  const vendors = await vendorService.getVendors(req.user, req.query);
  const response = vendors.map(vendor => vendor.transform());
  res.send(response);
});

const getVendor = catchAsync(async (req, res) => {
  const vendor = await vendorService.getVendorById(req.user, req.params.vendorId);
  res.send(vendor.transform());
});

const updateVendor = catchAsync(async (req, res) => {
  const vendor = await vendorService.updateVendor(req.user, req.params.vendorId, req.body);
  res.send(vendor.transform());
});

const deleteVendor = catchAsync(async (req, res) => {
  await vendorService.deleteVendor(req.user, req.params.vendorId);
  res.status(httpStatus.NO_CONTENT).send();
});

const getDefaultVendorId = catchAsync(async (req, res) => {
  const vendorId = await vendorService.getDefaultVendorId(req.user);
  res.send(vendorId);
});

module.exports = {
  createVendor,
  getVendors,
  getVendor,
  updateVendor,
  deleteVendor,
  getDefaultVendorId,
};
