const AWS = require('aws-sdk');
const path = require('path');
const exec = require('await-exec');
const fs = require('fs');
const csv = require('csvtojson');
const httpStatus = require('http-status');
const queue = require('queue');
const AppError = require('../utils/AppError');
const { createDocument, updateDocument } = require('../services/document.service');
const { getFilterById } = require('../services/filter.service');
const { getClientById } = require('../services/client.service');
const { skeletonHasClientTemplate, prepareSkeletonMappingsForApi } = require('../miner/skeletons')
const { findSimilarSkeleton, createSkeleton, populateOsmiumFromExactPrior, populateOsmiumFromFuzzyPrior } = require('../services/mbc.service');
const { updateUserCounter, userCreditsRemaining } = require('../services/user.service');
const { aixtract, populateOsmiumFromGgAI } = require('../services/smelter.service')
AWS.config.update({ region: 'us-east-1' });

let q = queue({ results: [] })
// get notified when jobs complete
q.on('success', function (result, job) {
  console.log('job finished processing:', job.toString().replace(/\n/g, ''))
  console.log('The result is:', result)
})
const extractOsmium = async (payload, cb) => {
  let finalJson = {};
  let newDocumentBody = Object.assign({}, payload.documentBody)
  const filename = payload.documentBody.alias;
  const fileName = filename.split('.')[0];
  const fileExtension = filename.split('.')[1];
  const outputDirName = `${fileName}-${fileExtension}`;
  const command = `${process.env.PYTHONV} ${process.env.TEXTRACTOR_PATH} --documents ${process.env.AWS_BUCKET}/${filename} --text --output ${process.env.TEXTRACTOR_OUTPUT}/${outputDirName}`;
  console.log(command);
  
  Promise.allSettled([
    exec(command, {
      timeout: 2000000,
    }),
    aixtract(filename)
  ]).then((results) => {
    console.log('Python Done');
    if (fs.existsSync(`${process.env.TEXTRACTOR_OUTPUT}/${outputDirName}/${outputDirName}-page-1-text-inreadingorder.csv`)) {
      // joining path of directory
      const directoryPath = `${process.env.TEXTRACTOR_OUTPUT}/${outputDirName}`;
      // passing directoryPath and callback function
      fs.readdir(directoryPath, async (err, files) => {
        // handling error
        if (err) {
          throw new AppError(httpStatus.NOT_FOUND, err);
        }
        let pageNumber = 0;
        // listing all files using forEach
        for (let i = 0; i < files.length; i++) {
          if (files[i].split('.')[1] === 'csv' && files[i].includes('inreadingorder')) {
            pageNumber += 1;
            const jsonArray = await csv().fromFile(path.join(directoryPath, files[i]));
            finalJson[`page_${pageNumber}`] = jsonArray;
          }
        }
        newDocumentBody.metadata = {...finalJson};
        newDocumentBody.ggMetadata = results[1].status === 'fulfilled' ? results[1].value : {}
        cb(null, newDocumentBody);
      });
    }
  })
};

const bulkSmelt = (req, res) => {
  try {
    const { body, user } = req;
    addFilesToQueue(user, body.files)
    res.json({ done: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Caught error' });
  }
};

const addFilesToQueue = async (user, files) => {
  const trimedFiles = await trimUnauthorizedDocuments(user._id, files);
  try{
    updateUserCounter(user._id, {counter: trimedFiles.length})
    for (const file of trimedFiles) {
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
      let createdDoc = await createDocument(user, documentBody)
      q.push(extractOsmium({id: createdDoc._id, documentBody}, (err, docBody) => {
        if (!err) {
          saveSmeltedResult(user, docBody, createdDoc.id)
        }else {
          console.log(err)
        }
      }) 
      );
    }  
  } catch (err) {
    console.log(err)
  }
}

const saveSmeltedResult = async (user, documentBody, taskId) => {
  try{
    let skeletonId = '';
    const filter = await getFilterById(user, documentBody.filter);    
    let matchingSkeleton = await findSimilarSkeleton(documentBody.metadata.page_1);
    if (matchingSkeleton) {
      matchingSkeleton = prepareSkeletonMappingsForApi(matchingSkeleton);
      skeletonId = matchingSkeleton._id
      if (skeletonHasClientTemplate(matchingSkeleton, user.id, filter.id)) {
          documentBody = populateOsmiumFromExactPrior(documentBody, matchingSkeleton, filter);  
        } else {
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
    updateDocument(user, taskId, {
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
      console.log('BREACH TENTATIVE: changed files length to : ',creditsRemaining )
    }
  return files
}

module.exports = {
  bulkSmelt
};
