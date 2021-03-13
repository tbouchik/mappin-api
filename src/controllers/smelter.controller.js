const AWS = require('aws-sdk');
const fs = require('fs');
const httpStatus = require('http-status');
const AppError = require('../utils/AppError');
const { createDocument, updateDocument } = require('../services/document.service');
const { getFilterById } = require('../services/filter.service');
const { getClientById } = require('../services/client.service');
const { skeletonHasClientTemplate, prepareSkeletonMappingsForApi } = require('../miner/skeletons')
const { findSimilarSkeleton, createSkeleton, populateOsmiumFromExactPrior, populateOsmiumFromFuzzyPrior } = require('../services/mbc.service');
const { updateUserCounter, userCreditsRemaining } = require('../services/user.service');
const { aixtract, populateOsmiumFromGgAI, fetchMetada } = require('../services/smelter.service')
const { omitBy } = require('lodash');

AWS.config.update({ region: 'us-east-1' });


const startSmelterEngine = async (payload) => {
  const filename = payload.documentBody.alias;
  const mimeType = payload.documentBody.mimeType;
  return Promise.allSettled([
    fetchMetada(filename),
    aixtract(filename, mimeType)
  ]).then((metadata) => {
    return {
      awsMetadata: metadata[0],
      gcpMetadata: metadata[1],
    }
  })
}

const moldOsmiumInDocument = async (payload) => {
  let newDocumentBody = Object.assign({}, payload.documentBody)
  let { awsMetadata, gcpMetadata } = await startSmelterEngine(payload);
  newDocumentBody.metadata = awsMetadata.status === 'fulfilled' ? awsMetadata.value : {};
  newDocumentBody.ggMetadata = gcpMetadata.status === 'fulfilled' ? omitBy(gcpMetadata.value, (v,k) => k[0]=='$') : {}
  return newDocumentBody
}

const bulkSmelt = async(req, res) => {
  try {
    const { body, user } = req;
    res.json({ done: true });
    let createdDocs = await addFilesToQueue(user, body.files)
    for (let i= 0; i< createdDocs.length; i ++) {
      await saveSmeltedResult(user, createdDocs[i], createdDocs[i].id)
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
      filter: file.filter,
      mimeType: file.mimeType,
      alias: file.alias,
      businessPurpose: file.businessPurpose,
      extractionType: file.extractionType,
      status: 'pending',
    };
    return createDocument(user, documentBody)
  });
    return Promise.allSettled(xy).then((createdDocsData)=> {
        let createdDocs = createdDocsData.filter(x => x.status === 'fulfilled').map(x => x.value.transform());
        return createdDocs;
      })
}

const injectOsmiumInBatchMolds = async (documents) => {
  return Promise.allSettled(documents.map(x => moldOsmiumInDocument({id:x._id, documentBody:x })))//TODO remove the need for two args in moldOsmiumInDOcument: x is present in both
    .then(moldedDocs => {
    return moldedDocs.filter(x => x.status === 'fulfilled').map(x => x.value);
    })
}

const saveSmeltedResult = async (user, documentBody, taskId) => {
  try{
    let skeletonId = '';
    const filter = await getFilterById(user, documentBody.filter);
    let matchingSkeleton = await findSimilarSkeleton(documentBody.metadata.page_1);
    if (matchingSkeleton) {
      matchingSkeleton = prepareSkeletonMappingsForApi(matchingSkeleton);
      skeletonId = matchingSkeleton._id;
      if (skeletonHasClientTemplate(matchingSkeleton, user.id, filter.id)) {
          documentBody = populateOsmiumFromExactPrior(documentBody, matchingSkeleton, filter);
        } else {
          documentBody = populateOsmiumFromGgAI(documentBody, filter);
          documentBody = populateOsmiumFromFuzzyPrior(documentBody, matchingSkeleton, filter, user.id);
        }
      } else {
        documentBody = populateOsmiumFromGgAI(documentBody, filter);
        const newSkeleton = await createSkeleton(user, documentBody, taskId);
        skeletonId = newSkeleton._id;
    }
    const hasRefField = filter.keys.some((key) => key.type === 'REF');
    if (hasRefField) {
      const refFieldIndex = filter.keys.findIndex((key) => key.type === 'REF');
      const client = await getClientById(user, documentBody.client);
      documentBody.osmium[refFieldIndex].Value = client.reference;
    }
    await updateDocument(user, taskId, {
      osmium: documentBody.osmium,
      metadata: documentBody.metadata,
      ggMetadata: documentBody.ggMetadata,
      status: 'smelted',
      skeleton: skeletonId,
    });
  } catch(err) {
    console.log(err)
  }
}

const trimUnauthorizedDocuments = async (user, files) => {
  const creditsRemaining = await userCreditsRemaining(user._id);
    if (files.length > creditsRemaining){
      files = files.slice(0,creditsRemaining)
    }
  return files
}

module.exports = {
  bulkSmelt,
};
