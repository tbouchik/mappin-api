const httpStatus = require('http-status');
const { pick } = require('lodash');
const AppError = require('../utils/AppError');
const { Invoice } = require('../models');
const { getOptions } = require('../utils/service.util');
const { getClientByEmail } = require('./client.service');
const status = require('./../enums/status');

const getInvoiceFilters = (user, query) => {
    let filter = {};
      // requestor is an accountant
    filter = pick(query, ['client', 'status', 'isArchived', 'mimeType', 'totalHt', 'totalTtc', 'date', 'vat', 'vendor', 'reference', 'orderNumber']);
    filter.user = user._id; // filter by accountant
    if (query.name) {
      filter.name = { $regex: `(?i)${query.name}` } 
    }
    return filter
};
  
const createInvoice = async (user, invoiceBody) => {
  if (!user.isClient) {
    // Upload done by accountant
    invoiceBody.user = user._id;
    if (!invoiceBody.client) {
      const genericClient = await getClientByEmail(process.env.GENERIC_EMAIL);
      invoiceBody.client = genericClient._id;
    }
  }
  const invoice = await Invoice.create(invoiceBody);
  return invoice;
};

const getInvoices = async (user, query) => {
  // FILTER
  const filter = getInvoiceFilters(user, query)
  // OPTIONS
  const options = getOptions(query)
  let invoices = await Invoice.find(filter, null, options);
  return invoices;
};

const archive = async (docIds) => {
  await Invoice.updateMany({'_id': { $in: docIds }}, {isArchived: true, status: status.ARCHIVED})
};

const getInvoiceById = async (user, invoiceId) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new AppError(httpStatus.NOT_FOUND, 'Invoice not found');
  } else if (!user.isClient && parseInt(invoice.user._id) !== parseInt(user._id)) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to read this invoice');
  } else if (user.isClient && parseInt(invoice.client._id) !== parseInt(user._id)) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to read this invoice');
  }
  return invoice;
};

const updateInvoice = async (user, invoiceId, updateBody) => {
  const invoice = await getInvoiceById(user, invoiceId);
  if (!invoice) {
    throw new AppError(httpStatus.NOT_FOUND, 'Invoice not found');
  } else {
    if (!user.isClient && parseInt(invoice.user._id) !== parseInt(user._id)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to modify this invoice');
    } else if (user.isClient) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to modify this invoice');
    }
    Object.assign(invoice, updateBody);
    try{
      await invoice.save();
    } catch(error){
      console.log(error)
    }
    return invoice;
  }
};

const deleteInvoice = async (user, invoiceId) => {
  const invoice = await getInvoiceById(user, invoiceId);
  if (!invoice) {
    throw new AppError(httpStatus.NOT_FOUND, 'Invoice not found');
  } else {
    if (!user.isClient && parseInt(invoice.user._id) !== parseInt(user._id)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to delete this invoice');
    } else if (user.isClient) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to delete this invoice');
    }
    await invoice.remove();
    return invoice;
  }
};


module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  archive,
};
