const AWS = require('aws-sdk');
const awsConfig = require('aws-config');
const projectId = process.env.GOOGLE_PROJECT_ID;
const location = process.env.GOOGLE_PROJECT_LOCATION;
const { DocumentUnderstandingServiceClient } = require('@google-cloud/documentai').v1beta2;
const { getFilterById } = require('../services/filter.service');
const { getClientById } = require('../services/client.service');
const { getSimilarVendor } = require('../services/vendor.service');
const { skeletonHasClientTemplate, prepareSkeletonMappingsForApi } = require('../miner/skeletons')
const { updateSkeleton } = require('../services/skeleton.service');
const { findSimilarSkeleton, createSkeleton, populateOsmiumFromExactPrior, populateOsmiumFromFuzzyPrior, populateInvoiceDataFromExactPrior, populateDefaultImputations } = require('../services/mbc.service');
const { mapToObject, formatValue, mergeClientTemplateIds } = require('../utils/service.util');
const { munkresMatch } = require('../utils/tinder');
const {  get } = require('lodash');
const { findTemplateKeyFromTag, identifyRole, identifySemanticField } = require('./../miner/template');
const { getS3PdfAlias } = require('../utils/pdf.util');
const path = require('path');
const { createVendor } = require('./vendor.service');

const s3options = {
    bucket: process.env.AWS_BUCKET_NAME,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
const keyFilename = process.env.GOOGLE_KEY_FILENAME;
const client = new DocumentUnderstandingServiceClient({projectId, keyFilename});
const s3 = new AWS.S3(awsConfig(s3options));

const parseForm = async (pdfContent) => {
    // Configure the request for processing the PDF
    const parent = `projects/${projectId}/locations/${location}`;
    const request = {
      parent,
      inputConfig: {
        contents: pdfContent ,//fileData.Body
        mimeType: 'application/pdf',
      },
      formExtractionParams: {
        enabled: true,
        keyValuePairHints: [ // can be one of these: ADDRESS, LOCATION, ORGANIZATION, PERSON, PHONE_NUMBER, ID, NUMBER, EMAIL, PRICE, TERMS, DATE, NAME.
          {
            key: 'Phone',
            valueTypes: ['PHONE_NUMBER'],
          },
          {
            key: 'Contact',
            valueTypes: ['EMAIL', 'NAME'],
          },
        ],
      },
    };

    // Recognizes text entities in the PDF document
    const [result] = await client.processDocument(request);

    // Get all of the document text as one big string
    const {text} = result;

    // Extract shards from the text field
    const getText = textAnchor => {
      // First shard in document doesn't have startIndex property
      if (textAnchor.textSegments[0] === undefined) {
        console.log(textAnchor)
      }
      const startIndex = textAnchor.textSegments[0].startIndex || 0;
      const endIndex = textAnchor.textSegments[0].endIndex;

      return text.substring(startIndex, endIndex);
    };

    // Process the output
    const [page1] = result.pages;
    const {formFields} = page1;
    let ggMetadata = new Map();

    for (const field of formFields) {
      try {
        const fieldName = getText(field.fieldName.textAnchor);
        const fieldValue = getText(field.fieldValue.textAnchor).replace(/\r?\n|\r/g, ' ');
        let valueData = { Text: fieldValue, Coords: field.fieldValue.boundingPoly.normalizedVertices };
        ggMetadata.set(fieldName, valueData);
      } catch(err) {
        console.log('error parsing a GGMETADATA item', err)
      }
    }
    return mapToObject(ggMetadata);
  }

const aixtract = async (bucketKey, mimeType) => {
  let s3Params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: bucketKey
  }
  return new Promise((resolve, reject) => {
    s3.getObject(s3Params, async (err, data) =>{
      if (err) {
          console.log(err, err.stack);
          reject(err);
      } // an error occurred
      else {
        if(mimeType !== 'application/pdf') {
          let pdfAlias = await getS3PdfAlias(data.Body, path.join(process.env.TEXTRACTOR_OUTPUT, bucketKey))
          resolve(aixtract(pdfAlias, 'application/pdf'))
        }else{
          parseForm(data.Body)
          .then(data => resolve(data))
          .catch(err => {
            console.error(err);
            reject(err);
          })
        }
      }
    })
  })
}

const populateOsmiumFromGgAI = async (user, documentBody, template, skeleton) => {
  let newDocument = Object.assign({}, documentBody);
  const ggMetadataKeys = Object.keys(newDocument.ggMetadata);
  const treshold = 39;
  // Populate from Semantic fields (AWS) except for Vendor
  let populatedTemplateKeysCache = new Set()
  for (let i = 0; i <template.keys.length; i++) {
    let currentRole = identifyRole(template, i);
    if (currentRole) {
      let currentSemanticField = identifySemanticField(currentRole);
      if (currentSemanticField in newDocument.semantics) {
        newDocument[currentRole] = formatValue(newDocument.semantics[currentSemanticField], template.keys[i].type, null, true);
        newDocument.osmium[i].Value = formatValue(newDocument.semantics[currentSemanticField], template.keys[i].type, null, false);
        populatedTemplateKeysCache.add(i)
      }
    }
  }
  // Populate suggested vendor if exists
  if ('VENDOR_NAME' in newDocument.semantics){
    let newVendorName = newDocument.semantics['VENDOR_NAME']
    let vendor = await getSimilarVendor(user, newVendorName);
    if (!vendor) {
      let newVendorBody = {name: newVendorName, confirmed: false};
      vendor = await createVendor(user, newVendorBody);
    }
    const mappingKey = mergeClientTemplateIds(user._id, newDocument.filter);
    skeleton.vendorMappings.set(mappingKey, vendor._id);
    updateSkeleton(skeleton._id, skeleton); 
    newDocument.vendor = vendor._id;
  }
  // Populate from KVP mappings (AWS + GCP)
  const nonRefTemplateKeys = template.keys.filter((x, idx) => x.type !== 'REF' && !populatedTemplateKeysCache.has(idx) ).map(x => [x.value].concat(x.tags)).flat();
  const keysMatches = munkresMatch(nonRefTemplateKeys, ggMetadataKeys, treshold);
  for (const [templateKeyOrTag, ggKey] of Object.entries(keysMatches)) {
    let templateKey = findTemplateKeyFromTag(template, templateKeyOrTag);
    osmiumIndex = newDocument.osmium.findIndex(x => x.Key === templateKey);
    templateIndex = template.keys.findIndex(x => x.value === templateKey);
    if(templateIndex){
      let currentRole = identifyRole(template, templateIndex);
      if (currentRole) {
        newDocument[currentRole] = templateIndex !== undefined ? formatValue(newDocument.ggMetadata[ggKey].Text, template.keys[templateIndex].type, null, true) : newDocument.ggMetadata[ggKey].Text;
      }
      newDocument.osmium[osmiumIndex].Value = templateIndex !== undefined ? formatValue(newDocument.ggMetadata[ggKey].Text, template.keys[templateIndex].type, null, false) : newDocument.ggMetadata[ggKey].Text;
    }
  }
  return newDocument;
}

const populateInvoiceDataFromGgAI = (documentBody, template) => {
  /**
   * TEMPORARY FUNCTION USED FOR BEARINGPOINT POC
   */
  let newDocument = Object.assign({}, documentBody);
  const nonRefTemplateKeys = template.keys.filter(x => x.type !== 'REF').map(x => [x.value].concat(x.tags)).flat();
  const ggMetadataKeys = Object.keys(newDocument.ggMetadata);
  const treshold = 39;
  const keysMatches = munkresMatch(nonRefTemplateKeys, ggMetadataKeys, treshold);
  for (const [templateKeyOrTag, ggKey] of Object.entries(keysMatches)) {
    let templateKey = findTemplateKeyFromTag(template, templateKeyOrTag)
    templateIndex = template.keys.findIndex(x => x.value === templateKey);
    newDocument[templateKey]= templateIndex !== undefined ? formatValue( newDocument.ggMetadata[ggKey].Text, template.keys[templateIndex].type, null, true) :  newDocument.ggMetadata[ggKey].Text;
  }
  return newDocument
}

const fetchMetada = async (filename, isBankStatement) => {
  let lambda = new AWS.Lambda();
  let payload = {
    bucketName: process.env.AWS_BUCKET_NAME,
    document: filename,
    region: process.env.AWS_REGION,
    tables: isBankStatement || false,
  };
  let params = {
    FunctionName: process.env.TEXTRACT_LAMBDA, 
    Payload: JSON.stringify(payload)
  };
  return new Promise((resolve, reject) => {
    lambda.invoke(params, function(err, data) {
      if (err) reject(err);
      else     resolve(JSON.parse(data.Payload));
    });
  })
}

const fetchExpenseItems = async (filename) => {
  let lambda = new AWS.Lambda();
  let payload = {
    bucketName: process.env.AWS_BUCKET_NAME,
    document: filename,
    region: process.env.AWS_REGION,
  };
  let params = {
    FunctionName: process.env.INVOICE_EXPENSE_LAMBDA, 
    Payload: JSON.stringify(payload)
  };
  return new Promise((resolve, reject) => {
    lambda.invoke(params, function(err, data) {
      if (err) reject(err);
      else     resolve(JSON.parse(data.Payload));
    });
  })
}

const populateInvoiceOsmium = async (user, documentBody, taskId) => {
  let skeletonId = '';
    const filter = await getFilterById(user, documentBody.filter);
    let matchingSkeleton = await findSimilarSkeleton(get(documentBody, 'metadata.page_1', {}));
    if (matchingSkeleton) {
      matchingSkeleton = prepareSkeletonMappingsForApi(matchingSkeleton);
      skeletonId = matchingSkeleton._id;
      if (skeletonHasClientTemplate(matchingSkeleton, user.id, filter.id)) {
          documentBody = populateOsmiumFromExactPrior(documentBody, matchingSkeleton, filter, null);
        } else {
          documentBody = await populateOsmiumFromGgAI(user, documentBody, filter, matchingSkeleton);
          documentBody = await populateOsmiumFromFuzzyPrior(documentBody, matchingSkeleton, filter, user);
        }
      } else {
        let newSkeleton = await createSkeleton(user, documentBody, taskId);
        newSkeleton = prepareSkeletonMappingsForApi(newSkeleton);
        documentBody = await populateOsmiumFromGgAI(user, documentBody, filter, newSkeleton);
        skeletonId = newSkeleton._id;
      }
    documentBody = populateDefaultImputations(documentBody, filter);
    const hasRefField = filter.keys.some((key) => key.type === 'REF');
    if (hasRefField) {
      const refFieldIndex = filter.keys.findIndex((key) => key.type === 'REF');
      const client = await getClientById(user, documentBody.client);
      documentBody.osmium[refFieldIndex].Value = client.reference;
    }
  return {skeletonId, document: documentBody };
}

const populateInvoiceData = async (user, documentBody, taskId) => {
  /**
   * TEMPORARY FUNCTION USED FOR BEARINGPOINT POC
   */
  let skeletonId = null;
    const filter = await getFilterById(user, documentBody.filter);
    let matchingSkeleton = await findSimilarSkeleton(get(documentBody, 'metadata.page_1', {}));
    if (matchingSkeleton) {
      matchingSkeleton = prepareSkeletonMappingsForApi(matchingSkeleton);
      skeletonId = matchingSkeleton._id;
      if (skeletonHasClientTemplate(matchingSkeleton, user.id, filter.id)) {
          documentBody = populateInvoiceDataFromExactPrior(documentBody, matchingSkeleton, filter);
        }
    } else {
        documentBody = populateInvoiceDataFromGgAI(documentBody, filter);
        const newSkeleton = await createSkeleton(user, documentBody, taskId);
        skeletonId = newSkeleton._id;
    }
  return {skeletonId, document: documentBody };
}


module.exports = {
    aixtract,
    fetchMetada,
    populateOsmiumFromGgAI,
    populateInvoiceOsmium,
    populateInvoiceData,
    populateInvoiceDataFromGgAI,
    fetchExpenseItems
  };