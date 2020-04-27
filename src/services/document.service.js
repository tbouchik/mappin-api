const httpStatus = require('http-status');
const { pick } = require('lodash');
const AppError = require('../utils/AppError');
const { Document } = require('../models');
const { getQueryOptions } = require('../utils/service.util');

const createDocument = async (user, documentBody) => {
  documentBody.user = user._id;
  const document = await Document.create(documentBody);
  return document;
};

const getDocuments = async (user, query) => {
  const filter = pick(query, ['name', 'role', 'company']);
  filter.user = user._id;
  const options = getQueryOptions(query);
  const documents = await Document.find(filter, null, options);
  return documents;
};

const getDocumentById = async (user, documentId) => {
  const document = await Document.findById(documentId);
  if (!document) {
    throw new AppError(httpStatus.NOT_FOUND, 'Document not found');
  } else if (parseInt(document.user) !== parseInt(user._id)){
    throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to read this document');
  }
  return document;
};

const updateDocument = async (user, documentId, updateBody) => {
  const document = await getDocumentById(user, documentId);
  Object.assign(document, updateBody);
  await document.save();
  return document;
};

const deleteDocument = async (user, documentId) => {
  const document = await getDocumentById(user, documentId);
  await document.remove();
  return document;
};

module.exports = {
  createDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
};
