const AWS = require('aws-sdk');
const awsConfig = require('aws-config');
const projectId = process.env.GOOGLE_PROJECT_ID;
const location = process.env.GOOGLE_PROJECT_LOCATION;
const { DocumentUnderstandingServiceClient } = require('@google-cloud/documentai').v1beta2;
const { mapToObject, formatValue } = require('../utils/service.util');
const { munkresMatch } = require('../utils/tinder');

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
      const startIndex = textAnchor.textSegments[0].startIndex || 0;
      const endIndex = textAnchor.textSegments[0].endIndex;

      return text.substring(startIndex, endIndex);
    };

    // Process the output
    const [page1] = result.pages;
    const {formFields} = page1;
    let ggMetadata = new Map();

    for (const field of formFields) {
        
      const fieldName = getText(field.fieldName.textAnchor);
      const fieldValue = getText(field.fieldValue.textAnchor).replace(/\r?\n|\r/g, ' ');
      let valueData = { Text: fieldValue, Coords: field.fieldValue.boundingPoly.normalizedVertices };
      ggMetadata.set(fieldName, valueData);
      console.log('-------------------------------');
      console.log(`\t(${fieldName} =====>>> ${fieldValue})`);
    }
    return mapToObject(ggMetadata);
  }

const aixtract = (bucketKey) => {
    let s3Params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: bucketKey
    }
    return new Promise((resolve, reject) => {
      s3.getObject(s3Params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            reject(err);
        } // an error occurred
        else {
            parseForm(data.Body)
            .then(data => resolve(data))
            .catch(err => {
                console.error(err);
                reject(err);
            });
        }
      })
  })
}

const populateOsmiumFromGgAI = (documentBody, template) => {
  let newDocument = Object.assign({}, documentBody);
  const nonRefTemplateKeys = template.keys.filter(x => x.type !== 'REF' || x.type !== 'IMPUT').map(x => x.value);
  const ggMetadataKeys = Object.keys(newDocument.ggMetadata);
  const treshold = 39;
  const keysMatches = munkresMatch(nonRefTemplateKeys, ggMetadataKeys, treshold);
  for (const [templateKey, ggKey] of Object.entries(keysMatches)) {
    osmiumIndex = newDocument.osmium.findIndex(x => x.Key === templateKey);
    templateIndex = template.keys.findIndex(x => x.value === templateKey);
    newDocument.osmium[osmiumIndex].Value = templateIndex !== undefined ? formatValue( newDocument.ggMetadata[ggKey].Text, template.keys[templateIndex].type) :  newDocument.ggMetadata[ggKey].Text;
  }
  return newDocument
}

/**
 * GGMetadata stores: docKey STRING <-> docValue OBJECT< Text, ...NormalizedCoordinates>
 * GGMappings stores: templateKey STRING<-> docKey STRING
 */
module.exports = {
    aixtract,
    populateOsmiumFromGgAI
  };