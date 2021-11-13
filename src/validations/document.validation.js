const Joi = require('@hapi/joi');
const { objectId } = require('./custom.validation');
const status = require('./../enums/status');
const mimeType = require('./../enums/mimeType');
const extraction = require('./../enums/extraction');

const createDocument = {
  body: Joi.object().keys({
    link: Joi.string() // TODO Validat link is a URL
      .required(),
    name: Joi.string().required(),
    metadata: Joi.object().required(),
    mimeType: Joi.string()
      .required()
      .valid(mimeType.PNG, mimeType.JPG, mimeType.PDF),
    alias: Joi.string().required(),
    businessPurpose: Joi.string(),
    extractionType: Joi.string().valid(extraction.FORMS, extraction.TABLES, extraction.TEXT),
    status: Joi.string().valid(status.PENDING, status.SMELTED, status.VALIDATED, status.ERROR, status.ARCHIVED),
    isBankStatement: Joi.boolean().required(),
    bankOsmium: Joi.object(),
    osmium: Joi.array(),
    filter: Joi.array(),
    ggMetadata: Joi.object(),
    isArchived: Joi.boolean(),
    totalHt:Joi.number(),
    totalTtc:Joi.number(),
    vat:Joi.number(),
    vendor:Joi.string(),
    dateBeg:Joi.date(),
    dateEnd:Joi.date(),
    invoiceDate: Joi.date(),
    dates:Joi.array(),
    bankEntity:Joi.string(),
  }),
};

const getDocuments = {
  query: Joi.object().keys({
    userId: Joi.string().custom(objectId),
    companyId: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    isBankStatement: Joi.boolean(),
    client:Joi.string(),
    sort: Joi.any(),
    name: Joi.string(),
    status: Joi.string().valid(status.PENDING, status.SMELTED, status.VALIDATED, status.ERROR, status.ARCHIVED),
    filter: Joi.string().custom(objectId),
    isArchived: Joi.boolean(),
    totalHt:Joi.number(),
    totalTtc:Joi.number(),
    vat:Joi.number(),
    vendor:Joi.string(),
    dateBeg:Joi.date(),
    dateEnd:Joi.date(),
    dates:Joi.array(),
    invoiceDate: Joi.date(),
    bankEntity:Joi.string(),
    totalHtOperator:Joi.string(),
    totalTtcOperator:Joi.string(),
    vatOperator:Joi.string(),
    contains:Joi.string(),
  }),
};

const exportBulkCSV = {
  query: Joi.object().keys({
    userId: Joi.string().custom(objectId),
    companyId: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    isBankStatement: Joi.boolean(),
    client:Joi.string(),
    sort: Joi.any(),
    name: Joi.string(),
    status: Joi.string().valid(status.PENDING, status.SMELTED, status.VALIDATED, status.ERROR, status.ARCHIVED),
    filter: Joi.string().custom(objectId),
    isArchived: Joi.boolean(),
    totalHt:Joi.number(),
    totalTtc:Joi.number(),
    vat:Joi.number(),
    vendor:Joi.string(),
    dateBeg:Joi.date(),
    dateEnd:Joi.date(),
    invoiceDate: Joi.date(),
    dates:Joi.array(),
    bankEntity:Joi.string(),
    totalHtOperator:Joi.string(),
    totalTtcOperator:Joi.string(),
    vatOperator:Joi.string(),
    contains:Joi.string(),
  }),
};

const getNextSmeltedDocumentIds = {
  query: Joi.object().keys({
    userId: Joi.string().custom(objectId),
    companyId: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    client:Joi.string(),
    skip: Joi.number(),
    sort: Joi.any(),
    isBankStatement: Joi.boolean(),
    side: Joi.string(),
    current: Joi.string(),
    name: Joi.string(),
    status: Joi.string().valid(status.PENDING, status.SMELTED, status.VALIDATED, status.ERROR, status.ARCHIVED),
    filter: Joi.string().custom(objectId),
    isArchived: Joi.boolean(),
    totalHt:Joi.number(),
    totalTtc:Joi.number(),
    vat:Joi.number(),
    vendor:Joi.string(),
    dateBeg:Joi.date(),
    dateEnd:Joi.date(),
    invoiceDate: Joi.date(),
    dates:Joi.array(),
    bankEntity:Joi.string(),
    totalHtOperator:Joi.string(),
    totalTtcOperator:Joi.string(),
    vatOperator:Joi.string(),
    contains:Joi.string(),
  }),
};

const getNextDocumentIds = {
  query: Joi.object().keys({
    userId: Joi.string().custom(objectId),
    companyId: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    client:Joi.string(),
    skip: Joi.number(),
    sort: Joi.any(),
    name: Joi.string(),
    isBankStatement: Joi.boolean(),
    side: Joi.string(),
    current: Joi.string(),
    status: Joi.string().valid(status.PENDING, status.SMELTED, status.VALIDATED, status.ERROR, status.ARCHIVED),
    filter: Joi.string().custom(objectId),
    isArchived: Joi.boolean(),
    totalHt:Joi.number(),
    totalTtc:Joi.number(),
    vat:Joi.number(),
    vendor:Joi.string(),
    dateBeg:Joi.date(),
    dateEnd:Joi.date(),
    invoiceDate: Joi.date(),
    dates:Joi.array(),
    bankEntity:Joi.string(),
    totalHtOperator:Joi.string(),
    totalTtcOperator:Joi.string(),
    vatOperator:Joi.string(),
    contains:Joi.string(),
  }),
};

const getDocument = {
  params: Joi.object().keys({
    documentId: Joi.string().custom(objectId),
  }),
};

const updateDocument = {
  params: Joi.object().keys({
    documentId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      metadata: Joi.array(),
      mimeType: Joi.string().valid(mimeType.PNG, mimeType.JPG, mimeType.PDF),
      alias: Joi.string(),
      bankOsmium: Joi.object(),
      osmium: Joi.array(),
      mbc: Joi.object(),
      imput:Joi.boolean().allow(null),
      businessPurpose: Joi.string(),
      isBankStatement: Joi.boolean(),
      extractionType: Joi.string().valid(extraction.FORMS, extraction.TABLES, extraction.TEXT),
      status: Joi.string().valid(status.PENDING, status.SMELTED, status.VALIDATED, status.ERROR, status.ARCHIVED),
      client: Joi.string(),
      skeleton: Joi.string(),
      validatedBy: Joi.string(),
      uploadedBy: Joi.string(),
      filter: Joi.string().custom(objectId),
      ggMetadata: Joi.object(),
      isArchived: Joi.boolean(),
      totalHt:Joi.number(),
      totalTtc:Joi.number(),
      vat:Joi.number(),
      vendor:Joi.string(),
      dateBeg:Joi.date(),
      dateEnd:Joi.date(),
      invoiceDate: Joi.date(),
      dates:Joi.array(),
      bankEntity:Joi.string(),
    })
    .min(1),
};

const updateManyDocuments = {
  body: Joi.object()
    .keys({
      idsArray: Joi.array(), 
      body: Joi.object(),
    })
    .min(1),
};

const deleteDocument = {
  params: Joi.object().keys({
    documentId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createDocument,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  getNextSmeltedDocumentIds,
  getNextDocumentIds,
  exportBulkCSV,
  updateManyDocuments,
};
