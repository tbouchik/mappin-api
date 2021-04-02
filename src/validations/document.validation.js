const Joi = require('@hapi/joi');
const { objectId } = require('./custom.validation');

const createDocument = {
  body: Joi.object().keys({
    link: Joi.string() // TODO Validat link is a URL
      .required(),
    name: Joi.string().required(),
    metadata: Joi.object().required(),
    mimeType: Joi.string()
      .required()
      .valid('image/png', 'image/jpeg', 'application/pdf'),
    alias: Joi.string().required(),
    businessPurpose: Joi.string(),
    extractionType: Joi.string().valid('FORMS', 'TABLES', 'TEXT'),
    status: Joi.string().valid('pending', 'smelted', 'validated'),
    osmium: Joi.array(),
    filter: Joi.array(),
    ggMetadata: Joi.object(),
    isArchived: Joi.boolean(),
  }),
};

const getDocuments = {
  query: Joi.object().keys({
    userId: Joi.string().custom(objectId),
    companyId: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    client:Joi.string(),
    sort: Joi.any(),
    name: Joi.string(),
    status: Joi.string().valid('pending', 'smelted', 'validated'),
    filter: Joi.string().custom(objectId),
    isArchived: Joi.boolean(),
  }),
};

const exportBulkCSV = {
  query: Joi.object().keys({
    userId: Joi.string().custom(objectId),
    companyId: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    client:Joi.string(),
    sort: Joi.any(),
    name: Joi.string(),
    status: Joi.string().valid('pending', 'smelted', 'validated'),
    filter: Joi.string().custom(objectId),
    isArchived: Joi.boolean(),
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
    side: Joi.string(),
    current: Joi.string(),
    name: Joi.string(),
    status: Joi.string().valid('pending', 'smelted', 'validated'),
    filter: Joi.string().custom(objectId),
    isArchived: Joi.boolean(),
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
    side: Joi.string(),
    current: Joi.string(),
    status: Joi.string().valid('pending', 'smelted', 'validated'),
    filter: Joi.string().custom(objectId),
    isArchived: Joi.boolean(),
  }),
};

const getDocumentsByClient = {
  query: Joi.object().keys({
    userId: Joi.string().custom(objectId),
    client: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    isArchived: Joi.boolean(),
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
      mimeType: Joi.string().valid('image/png', 'image/jpeg', 'application/pdf'),
      alias: Joi.string(),
      osmium: Joi.array(),
      mbc: Joi.object(),
      imput:Joi.boolean().allow(null),
      businessPurpose: Joi.string(),
      extractionType: Joi.string().valid('FORMS', 'TABLES', 'TEXT'),
      status: Joi.string().valid('pending', 'smelted', 'validated'),
      client: Joi.string(),
      skeleton: Joi.string(),
      validatedBy: Joi.string(),
      uploadedBy: Joi.string(),
      filter: Joi.string().custom(objectId),
      ggMetadata: Joi.object(),
      isArchived: Joi.boolean(),
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
  getDocumentsByClient,
  getNextSmeltedDocumentIds,
  getNextDocumentIds,
  exportBulkCSV,
};
