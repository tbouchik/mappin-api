const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { invoiceService } = require('../services');
const { updateSkeletonFromInvoiceUpdate, populateInvoiceDataFromExactPrior } = require('../services/mbc.service');
const { getFilterById } = require('../services/filter.service');
const status = require('./../enums/status');

const createInvoice = catchAsync(async (req, res) => {
  const invoice = await invoiceService.createInvoice(req.user, req.body);
  res.status(httpStatus.CREATED).send(invoice.transform());
});

const getInvoices = catchAsync(async (req, res) => {
  const invoices = await invoiceService.getInvoices(req.user, req.query);
  const response = invoices.map(invoice => invoice.transform());
  res.send(response);
});

const getInvoice = catchAsync(async (req, res) => {
  const invoice = await invoiceService.getInvoiceById(req.user, req.params.invoiceId);
  res.send(invoice.transform());
});

const updateInvoice = catchAsync(async (req, res) => {
  const updateBody = req.body || null;
  let invoice = await invoiceService.updateInvoice(req.user, req.params.invoiceId, req.body);
  let template = await getFilterById(req.user, invoice.filter, true);
  const skeleton = await updateSkeletonFromInvoiceUpdate(req.user, invoice, template, updateBody);
  let collateralQuery = {status: status.SMELTED, skeleton: skeleton._id };
  let collateralDocs = await invoiceService.getInvoices(req.user, collateralQuery);
  let updatedCollateralInvoices = collateralDocs.map(x => populateInvoiceDataFromExactPrior(x.transform(), skeleton, template));
  collateralDocs.forEach((invoice, idx) => {
    Object.assign(invoice, updatedCollateralInvoices[idx]);
    try{
      invoice.save();
    } catch(error) {
      console.log(error);
    }
  })
  res.send(invoice.transform());
});

const deleteInvoice = catchAsync(async (req, res) => {
  await invoiceService.deleteInvoice(req.user, req.params.invoiceId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
};
