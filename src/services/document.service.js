const httpStatus = require('http-status');
const { pick } = require('lodash');
const AppError = require('../utils/AppError');
const { Document } = require('../models');
const { getQueryOptions } = require('../utils/service.util');
const { getFilterById, getFilters } = require('./filter.service');
const { getClientByEmail } = require ('./client.service');

const createDocument = async (user, documentBody) => {
  if (!user.isClient) {
    // Upload done by accountant
    documentBody.user = user._id;
    if (!documentBody.client) {
      const genericClient = await getClientByEmail(process.env.GENERIC_EMAIL);
      documentBody.client = genericClient._id;
    }
  } else {
    // Upload done by client so "user" field must be populated with accountant id
    documentBody.client = user._id;
    documentBody.user = client.user;
  }
  // Assign smart filter if no filter is specified
  if (!documentBody.filter) {
    const query = {
      name: 'Smart Filter',
    }
    const smartFilter = await getFilters(user, query);
    smartFilter = smartFilter[0];
    documentBody.filter = smartFilter._id;
  }
  // Populate uploader
  documentBody.uploadedBy = user._id;
  // Shape Osmium according to filter
  documentBody.osmium = shapeOsmium(documentBody.filter);
  const document = await Document.create(documentBody);
  return document;
};

const getDocuments = async (user, query) => {
  let filter = {};
  if (!user.isClient) {
    // requestor is an accountant
    filter = pick(query, ['client']); // filter by client if specified in query by accountant
    filter.user = user._id; // filter by accountant
  } else {
    // requestor is a client
    filter.client = user._id; // clients should only view their own files
  }
  const options = getQueryOptions(query);
  const documents = await Document.find(filter, null, options);
  return documents;
};

const getDocumentById = async (user, documentId) => {
  const document = await Document.findById(documentId);
  if (!document) {
    throw new AppError(httpStatus.NOT_FOUND, 'Document not found');
  } else if (!user.isClient && parseInt(document.user) !== parseInt(user._id)) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to read this document');
  } else if (user.isClient && parseInt(document.client) !== parseInt(user._id)) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to read this document');
  }
  return document;
};

const updateDocument = async (user, documentId, updateBody) => {
  const document = await getDocumentById(user, documentId);
  if (!document) {
    throw new AppError(httpStatus.NOT_FOUND, 'Document not found');
  } else {
    if (!user.isClient && parseInt(document.user) !== parseInt(user._id)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to modify this document');
    } else if (user.isClient) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to modify this document');
    }
    if (document.filter !== updateBody.filter) { // User chose to change filter
      documentBody.osmium = shapeOsmium(updateBody.filter); // Osmium must follow
    }
    Object.assign(document, updateBody);
    await document.save();
    return document;
  }
};

const deleteDocument = async (user, documentId) => {
  const document = await getDocumentById(user, documentId);
  if (!document) {
    throw new AppError(httpStatus.NOT_FOUND, 'Document not found');
  } else {
    if (!user.isClient && parseInt(document.user) !== parseInt(user._id)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to delete this document');
    } else if (user.isClient) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to delete this document');
    }
    Object.assign(document, updateBody);
    await document.remove();
    return document;
  }
};

const shapeOsmium = async (filterId) => {
  let osmium = [];
  // load filter from DB
  const filterArr = await getFilterById(filterId);
  // Shape Osmium according to filter
  osmium = filterArr.map(filterKey => {
    return { Key: filterKey, Value: null };
  })
  return osmium;
}

module.exports = {
  createDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
};
