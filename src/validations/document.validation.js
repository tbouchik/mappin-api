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
    name: Joi.string(),
    status: Joi.string().valid('pending', 'smelted', 'validated'),
    filter: Joi.string().custom(objectId),
  }),
};

const getDocumentsByClient = {
  query: Joi.object().keys({
    userId: Joi.string().custom(objectId),
    client: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
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
      businessPurpose: Joi.string(),
      extractionType: Joi.string().valid('FORMS', 'TABLES', 'TEXT'),
      status: Joi.string().valid('pending', 'smelted', 'validated'),
      client: Joi.string(),
      validatedBy: Joi.string(),
      uploadedBy: Joi.string(),
      filter: Joi.array(),
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
};
