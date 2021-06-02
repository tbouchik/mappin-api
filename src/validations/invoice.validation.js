const Joi = require('@hapi/joi');
const { objectId } = require('./custom.validation');
const status = require('./../enums/status');
const mimeType = require('./../enums/mimeType');

const createInvoice = {
  body: Joi.object().keys({
    link: Joi.string().required(),
    mimeType: Joi.string().required().valid(mimeType.PNG, mimeType.JPG, mimeType.PDF),
    name: Joi.string(),
    metadata: Joi.object(),
    alias: Joi.string(),
  }),
};

const getInvoices = {
  query: Joi.object().keys({
    userId: Joi.string().custom(objectId),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    client:Joi.string(),
    sort: Joi.any(),
    name: Joi.string(),
    status: Joi.string().valid(status.PENDING, status.SMELTED, status.VALIDATED, status.ERROR, status.ARCHIVED),
    isArchived: Joi.boolean(),
    totalHt:Joi.number(),
    totalTtc:Joi.number(),
    vat:Joi.string(),
    vendor:Joi.string(),
    date: Joi.date(),
    reference:Joi.string(),
    orderNumber:Joi.number(),
  }),
};

const getInvoice = {
  params: Joi.object().keys({
    invoiceId: Joi.string().custom(objectId),
  }),
};

const updateInvoice = {
  params: Joi.object().keys({
    invoiceId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      metadata: Joi.array(),
      mimeType: Joi.string().valid(mimeType.PNG, mimeType.JPG, mimeType.PDF),
      alias: Joi.string(),
      status: Joi.string().valid(status.PENDING, status.SMELTED, status.VALIDATED, status.ERROR, status.ARCHIVED),
      skeleton: Joi.string(),
      filter: Joi.string().custom(objectId),
      ggMetadata: Joi.object(),
      isArchived: Joi.boolean(),
      totalHt:Joi.number(),
      totalTtc:Joi.number(),
      vat:Joi.string(),
      vendor:Joi.string(),
      date: Joi.date(),
      reference:Joi.string(),
      orderNumber: Joi.number(),
    })
    .min(1),
};

const deleteInvoice = {
  params: Joi.object().keys({
    invoiceId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
};
