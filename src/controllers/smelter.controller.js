const AWS = require('aws-sdk');
const httpStatus = require('http-status');
const AppError = require('../utils/AppError');
const { createDocument, updateDocument } = require('../services/document.service');
const { updateUserCounter, userCreditsRemaining } = require('../services/user.service');
const { aixtract, fetchMetada, populateInvoiceOsmium } = require('../services/smelter.service')
const { omitBy } = require('lodash');
const status = require('./../enums/status')

AWS.config.update({ region: 'us-east-1' });


const startSmelterEngine = async (payload) => {
  const filename = payload.documentBody.alias;
  const mimeType = payload.documentBody.mimeType;
  const isBankStatement = payload.documentBody.isBankStatement;
  return Promise.allSettled([
    fetchMetada(filename, isBankStatement),
    aixtract(filename, mimeType)
  ]).then((metadata) => {
    return {
      awsMetadata: metadata[0],
      gcpMetadata: metadata[1],
    };
  })
}

const moldOsmiumInDocument = async (payload) => {
  let newDocumentBody = Object.assign({}, payload.documentBody);
  let { awsMetadata, gcpMetadata } = await startSmelterEngine(payload);
  newDocumentBody.metadata = awsMetadata.status === 'fulfilled' ? awsMetadata.value.words : {};
  newDocumentBody.ggMetadata = gcpMetadata.status === 'fulfilled' ? omitBy(gcpMetadata.value, (v,k) => k[0]=='$') : {};
  if (newDocumentBody.isBankStatement) {
    newDocumentBody.bankOsmium = awsMetadata.status === 'fulfilled' ? awsMetadata.value.tables : {};
  }
  return newDocumentBody;
}

const bulkSmelt = async(req, res) => {
  try {
    const { body, user } = req;
    res.json({ done: true });
    let createdDocs = await addFilesToQueue(user, body.files);
    for (let i= 0; i< createdDocs.length; i ++) {
      await saveSmeltedResult(user, createdDocs[i], createdDocs[i].id);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Caught error' });
  }
};

const addFilesToQueue = async (user, files) => {
  try{
    const trimedFiles = await trimUnauthorizedDocuments(user._id, files);
    updateUserCounter(user._id, {counter: trimedFiles.length})
    let emptyDocsBatch = await createBatchMolds(user, trimedFiles);
    let filledDocsBatch = await injectOsmiumInBatchMolds(emptyDocsBatch);
    return filledDocsBatch;
  } catch (err) {
    console.log(err)
  }
}

const createBatchMolds = async (user, files) => {
  let xy = files.map((file) => {
    let documentBody = {
      link: `${process.env.AWS_BUCKET}/${file.alias}`,
      name: file.name,
      metadata: {},
      ggMetadata: {},
      osmium: [],
      client: file.client,
      isBankStatement: file.isBankStatement,
      filter: file.filter,
      mimeType: file.mimeType,
      alias: file.alias,
      businessPurpose: file.businessPurpose,
      extractionType: file.extractionType,
      status: status.PENDING,
    };
    return createDocument(user, documentBody)
  });
    return Promise.allSettled(xy).then((createdDocsData)=> {
        let createdDocs = createdDocsData.filter(x => x.status === 'fulfilled').map(x => x.value.transform());
        return createdDocs;
      });
}

const injectOsmiumInBatchMolds = async (documents) => {
  return Promise.allSettled(documents.map(x => moldOsmiumInDocument({id:x._id, documentBody:x })))
    .then(moldedDocs => {
    return moldedDocs.filter(x => x.status === 'fulfilled').map(x => x.value);
    });
}

const saveSmeltedResult = async (user, documentBody, taskId) => {
  try{
    let skeletonId = null;
    let document = documentBody;
    ({ skeletonId, document } = await populateInvoiceOsmium(user, documentBody, taskId));
    await updateDocument(user, taskId, {
      osmium: document.osmium,
      bankOsmium: document.bankOsmium,
      metadata: document.metadata,
      ggMetadata: document.ggMetadata,
      status: status.SMELTED,
      skeleton: skeletonId,
    });
  } catch(err) {
    console.log(err);
  }
}

const trimUnauthorizedDocuments = async (user, files) => {
  const creditsRemaining = await userCreditsRemaining(user._id);
    if (files.length > creditsRemaining){
      files = files.slice(0,creditsRemaining)
    }
  return files;
}

module.exports = {
  bulkSmelt,
};
