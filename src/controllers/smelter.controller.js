const AWS = require('aws-sdk');
const { createDocument, updateDocument } = require('../services/document.service');
const { createSmeltError } = require('../services/smelterror.service');
const { updateUserCounter, userCreditsRemaining } = require('../services/user.service');
const { aixtract, fetchMetada, populateInvoiceOsmium, fetchExpenseItems } = require('../services/smelter.service')
const { omitBy } = require('lodash');
const status = require('./../enums/status')

AWS.config.update({ region: 'us-east-1' });


const startSmelterEngine = async (payload) => {
  const filename = payload.documentBody.alias;
  const mimeType = payload.documentBody.mimeType;
  const isBankStatement = payload.documentBody.isBankStatement;
  if(isBankStatement) {
    return Promise.allSettled([
      fetchMetada(filename, isBankStatement),
      aixtract(filename, mimeType)
    ]).then((metadata) => {
      return {
        awsMetadata: metadata[0],
        gcpMetadata: metadata[1],
        expenseItems: null
      };
    })
  } else {
    return Promise.allSettled([
      fetchMetada(filename, isBankStatement),
      aixtract(filename, mimeType),
      fetchExpenseItems(filename)
    ]).then((response) => {
      return {
        awsMetadata: response[0],
        gcpMetadata: response[1],
        expenseItems: response[2]
      };
    })
  }
  
}

const moldOsmiumInDocument = async (user, payload) => {
  let newDocumentBody = Object.assign({}, payload.documentBody);
  let { awsMetadata, gcpMetadata, expenseItems } = await startSmelterEngine(payload);
  if (awsMetadata.status === 'fulfilled') {
    newDocumentBody.metadata = awsMetadata.value.words
    if (newDocumentBody.isBankStatement) {
      newDocumentBody.bankOsmium = awsMetadata.value.tables;
    }
  } else {
    newDocumentBody.metadata = {}
    addSmeltError(user, newDocumentBody.id, awsMetadata.reason)
    throw 'Metadata smelt failed';
  }
  if (gcpMetadata.status === 'fulfilled') {
    newDocumentBody.ggMetadata = omitBy(gcpMetadata.value, (v,k) => k[0]=='$')
  } else {
    newDocumentBody.ggMetadata = {}
    addSmeltError(user, newDocumentBody.id, gcpMetadata.reason)
    throw 'GGMetadata smelt failed';
  }
  if(expenseItems && expenseItems.status === 'fulfilled') {
    newDocumentBody.references = expenseItems.value
  } else {
    newDocumentBody.references = {}
    addSmeltError(user, newDocumentBody.id, expenseItems.reason)
  }
  return newDocumentBody;
}

const bulkSmelt = async(req, res) => {
  const { body, user } = req;
  res.json({ done: true });
  let createdDocs = await addFilesToQueue(user, body.files);
  for (let i= 0; i< createdDocs.length; i ++) {
    try {
      await saveSmeltedResult(user, createdDocs[i], createdDocs[i].id);
    } catch (err) {
      addSmeltError(user, createdDocs[i].id, err);
    }
  }
};

const addSmeltError = (user, documentId, message) => {
  const body = {
    document:documentId,
    stack:message
  };
  createSmeltError(user, body)
  updateUserCounter(user._id, {counter: -1})
}

const addFilesToQueue = async (user, files) => {
  try{
    const trimedFiles = await trimUnauthorizedDocuments(user._id, files);
    updateUserCounter(user._id, {counter: trimedFiles.length})
    let emptyDocsBatch = await createBatchMolds(user, trimedFiles);
    let filledDocsBatch = await injectOsmiumInBatchMolds(user, emptyDocsBatch);
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

const injectOsmiumInBatchMolds = async (user, documents) => {
  return Promise.allSettled(documents.map(x => moldOsmiumInDocument(user, {id:x._id, documentBody:x })))
    .then(moldedDocs => {
    return moldedDocs.filter(x => x.status === 'fulfilled').map(x => x.value);
    });
}

const saveSmeltedResult = async (user, documentBody, taskId) => {
  let skeletonId = null;
  let document = documentBody;
  ({ skeletonId, document } = await populateInvoiceOsmium(user, documentBody, taskId));
  await updateDocument(user, taskId, {
    osmium: document.osmium,
    bankOsmium: document.bankOsmium,
    metadata: document.metadata,
    ggMetadata: document.ggMetadata,
    references: document.references,
    status: status.SMELTED,
    skeleton: skeletonId,
    invoiceDate: document.invoiceDate,
    vendor: document.vendor,
    totalHt: document.totalHt,
    totalTtc: document.totalTtc,
    vat: document.vat,
    dateEnd: document.dateEnd,
    dateBeg: document.dateBeg,
    bankEntity: document.bankEntity,
  })
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
