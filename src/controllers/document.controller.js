const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { documentService } = require('../services');
const { updateSkeletonFromDocUpdate, populateOsmiumFromExactPrior } = require('../services/mbc.service');
const { getFilterById } = require('../services/filter.service');
const status = require('./../enums/status');

const createDocument = catchAsync(async (req, res) => {
  const document = await documentService.createDocument(req.user, req.body);
  res.status(httpStatus.CREATED).send(document.transform());
});

const getDocuments = catchAsync(async (req, res) => {
  const documents = await documentService.getDocuments(req.user, req.query);
  const response = documents.map(document => document.transform());
  res.send(response);
});

const exportBulkCSV = catchAsync(async (req, res) => {
  const {aggregate, ids} = await documentService.exportBulkCSV(req.user, req.query);
  documentService.archive(ids);
  res.send(aggregate);
});

const getDocumentsCount = catchAsync(async (req, res) => {
  console.log('count' , req.query);
  const documentsCount = await documentService.getDocumentsCount(req.user, req.query);
  res.send(documentsCount);
});

const updateManyDocuments = catchAsync(async (req, res) => {
  await documentService.updateManyDocuments(req.user, req.body);
  res.send({"ok": true});
});

const deleteManyDocuments = catchAsync(async (req, res) => {
  await documentService.deleteManyDocuments(req.user, req.body);
  res.send({"ok": true});
});

const getNextSmeltedDocumentIds = catchAsync(async (req, res) => {
  console.log('Next Smelted ids' , req.query);
  const smeltedIds = await documentService.getNextSmeltedDocuments(req.user, req.query);
  res.send(smeltedIds);
});

const getNextDocumentIds = catchAsync(async (req, res) => {
  console.log('Next doc ids' , req.query);
  const nextIds = await documentService.getNextDocuments(req.user, req.query);
  res.send(nextIds);
});

const getDocumentsByClient = catchAsync(async (req, res) => {
  const documents = await documentService.getDocumentsByClient(req.user, req.params.clientId);
  const response = documents.map(document => document.transform());
  res.send(response);
});

const getDocument = catchAsync(async (req, res) => {
  const document = await documentService.getDocumentById(req.user, req.params.documentId);
  res.send(document.transform());
});

const updateDocument = catchAsync(async (req, res) => {
  const mbc = req.body.mbc || null;
  let document = await documentService.updateDocument(req.user, req.params.documentId, req.body);
  if (!document.isBankStatement) {
    let template = await getFilterById(req.user, document.filter, true);
    const skeleton = await updateSkeletonFromDocUpdate (req.user, document, template, mbc);
    let collateralQuery = {status: status.SMELTED, skeleton: skeleton._id };
    let collateralDocs = await documentService.getDocuments(req.user, collateralQuery);
    let updatedCollateralDocs = collateralDocs.map(x => populateOsmiumFromExactPrior(x.transform(), skeleton, template));
    collateralDocs.forEach((document, idx) => {
      Object.assign(document, updatedCollateralDocs[idx]);
      try{
        document.save();
      } catch(error) {
        console.log(error);
      }
    })
  }
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
  getDocumentsByClient,
  getDocumentsCount,
  getNextSmeltedDocumentIds,
  getNextDocumentIds,
  exportBulkCSV,
  updateManyDocuments,
  deleteManyDocuments,
};
