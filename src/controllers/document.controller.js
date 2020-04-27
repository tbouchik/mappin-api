const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { documentService } = require('../services');

const createDocument = catchAsync(async (req, res) => {
  const document = await documentService.createDocument(req.user, req.body);
  res.status(httpStatus.CREATED).send(document.transform());
});

const getDocuments = catchAsync(async (req, res) => {
  const documents = await documentService.getDocuments(req.user, req.query);
  const response = documents.map(document => document.transform());
  res.send(response);
});

const getDocument = catchAsync(async (req, res) => {
  const document = await documentService.getDocumentById(req.user, req.params.documentId);
  res.send(document.transform());
});

const updateDocument = catchAsync(async (req, res) => {
  const document = await documentService.updateDocument(req.user, req.params.documentId, req.body);
  res.send(document.transform());
});

const deleteDocument = catchAsync(async (req, res) => {
  await documentService.deleteDocument(req.user, req.params.documentId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createDocument,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
};
