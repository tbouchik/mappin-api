// mbc for Memory B cells - this was coded in the coronaverse
const { Skeleton } = require('../models');
const { skeletonsMatch, getGeoClosestBoxScores, skeletonStoreClientTemplate, skeletonUpdateBbox } = require('../miner/skeletons')
const { mergeClientTemplateIds } = require('../utils/service.util')
const { getFilterById } = require('../services/filter.service');
const { updateSkeleton } = require('../services/skeleton.service');
const { skeletonHasClientTemplate } = require('../miner/skeletons')
const fuzz = require('fuzzball');
const munkres = require('munkres-js');

const findSimilarSkeleton = async (skeleton) => {
  const skeletons = await Skeleton.find();
  let foundMatch = false;
  let candidate = null;
  let index = 0;
  while(!foundMatch && index < skeletons.length) {
    candidate = skeletons[index];
    foundMatch = skeletonsMatch(skeleton, candidate.ossature);
    index++;
  }
  return foundMatch === true? candidate : null;
};

const buildKeysDistanceMatrix = (newTemplateKeys, refTemplateKeys) => {
  let matrix = [];
  for (let i = 0; i < newTemplateKeys.length; i++) {
    let newTemplateKey = newTemplateKeys[i];
    let row = refTemplateKeys.map((refTemplateKey) => 100 - fuzz.ratio(newTemplateKey.value, refTemplateKey.value));
    matrix.push(row);

  }
  // newTemplateKeys.forEeach((newTemplateKey) => {
  //   let row = refTemplateKeys.map((refTemplateKey) => 100 - fuzz.ratio(newTemplateKey.value, refTemplateKey.value));
  //   matrix.push(row);
  // })
  return matrix;
}

const computeTemplatesSimilitude = (templatesDistanceMatrix, munkresCombination) => {
  let result = 0;
  munkresCombination.forEach((pair) => {
    result += templatesDistanceMatrix[pair[0]][pair[1]];
  })
  return result;
}


const flattenMunkres = (munkresOutput, templateKeysLength) => {
  let result = [];
  if (templateKeysLength) {
    result[templateKeysLength -1] = undefined;
    for (let i=0; i < munkresOutput.length; i++) {
      let matchPair = munkresOutput[i];
      result[matchPair[0]] = matchPair[1]
    }
  }
  return result
}


const getMostResemblantTemplate = (documentFilter, skeletonReference) => {
  let result = { key:'', template:'', indices: [] };
  let candidates = [] 
  let clientTemplateMap = skeletonReference.clientTemplateMapping;
  let bboxMap = skeletonReference.bboxMappings;
  for (let [clientId, templateIdArrays] of clientTemplateMap) {
    for (let i=0; i<templateIdArrays.length; i++){
      let templateId = templateIdArrays[i]
      if (skeletonHasClientTemplate(skeletonReference,clientId,templateId)) {
        let clientTempKey = mergeClientTemplateIds(clientId, templateId);
        candidates.push({ key: clientTempKey,
                          templateId: templateId,
                          templateKeys: extractTemplateKeysFromBBoxMap(bboxMap.get(clientTempKey))
                        })
      }
    }
}
  let bestScore = Number.MAX_SAFE_INTEGER;
  candidates.forEach((candidate) => {
    let distanceMatrix = buildKeysDistanceMatrix(documentFilter.keys, candidate.templateKeys);
    let munkresDistance = munkres(distanceMatrix)
    let newScore = computeTemplatesSimilitude(distanceMatrix, munkresDistance);
    if (newScore < bestScore) {
      bestScore = newScore;
      Object.assign(result, {
        key: candidate.key,
        template: candidate.templateKeys,
        indices: flattenMunkres(munkresDistance, documentFilter.keys.length),
      });
    }
  })
  return result;
};

const extractTemplateKeysFromBBoxMap = (bboxMap) => {
  let result = []
  for (const [k, v] of Object.entries(bboxMap)) {
    result.push({value: k})
  }
  return result;
}

const createSkeleton = async (user, payload, docId) => {
  let clientTemplateMapping = new Map(); //used Map instead of Object because the keys of an Object must be either a String or a Symbol.
  clientTemplateMapping.set(user.id,  [payload.filter]);
  let template = await getFilterById(user, payload.filter, true);
  let templateKeyBBoxMappingArr = []
  for (let i=0; i < template.keys.length; i++) {
    templateKeyBBoxMappingArr.push([template.keys[i].value , null])
  }
  let templateKeyBBoxMapping = new Map(templateKeyBBoxMappingArr) // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#relation_with_array_objects
  let bboxMappings = new Map();
  bboxMappings.set(mergeClientTemplateIds(user.id, payload.filter) , Object.fromEntries(templateKeyBBoxMapping));
  const skeletonBody = {
    ossature: payload.metadata.page_1,
    accountingNumber: 000000,
    document: docId,
    googleMetadata: {},
    clientTemplateMapping,
    bboxMappings,
  }
  const skeleton = await Skeleton.create(skeletonBody);
  return skeleton;
};

const populateOsmiumFromExactPrior = (documentBody, skeletonReference, filter) => {
  /**
   * for each key template of the filter
   *    verify that bbox matched has a good matching area  in the metadata
   *    if (above verifications work ){
   *        then update osmium
   *    } else {
   *        some guessing work is required
   *    }
   */
  let newDocument = Object.assign({}, documentBody);
  const bboxMappingKey = mergeClientTemplateIds(newDocument.user, newDocument.filter);
  let tempkeysToBoxMappingReference = skeletonReference.bboxMappings.get(bboxMappingKey);
  tempkeysToBoxMappingReference = new Map(Object.entries(tempkeysToBoxMappingReference));
  const docSkeleton = newDocument.metadata.page_1;
  for (let i = 0; i <filter.keys.length; i++) {
    let key = filter.keys[i];
    let referenceBbox = tempkeysToBoxMappingReference.get(key.value);
    if (referenceBbox) {
      let bestBbox = getGeoClosestBoxScores(docSkeleton, referenceBbox);
      newDocument.osmium[i].Value = bestBbox !== undefined ? bestBbox.bbox.Text : null;
    }
  }
 
  return newDocument;
}

const populateOsmiumFromFuzzyPrior = (documentBody, skeletonReference, template, clientId) => {
  const mostResemblantTemplateData = getMostResemblantTemplate(template, skeletonReference);
  skeletonReference = skeletonStoreClientTemplate(skeletonReference,clientId, template.id, template.keys)
  let newDocument = Object.assign({}, documentBody);
  const tempkeysToBoxMappingReference = skeletonReference.bboxMappings.get(mostResemblantTemplateData.key);
  const docSkeleton = newDocument.metadata.page_1;
  template.keys.map((key, index) => {
    let matchedIndex = mostResemblantTemplateData.indices[index]
    if (matchedIndex !== undefined) {
      let matchedKey = mostResemblantTemplateData.template[matchedIndex]
      let referenceBbox = tempkeysToBoxMappingReference[matchedKey.value];
      if (referenceBbox) {
        let bestBboxData = getGeoClosestBoxScores(docSkeleton, referenceBbox);
        newDocument.osmium[index].Value = bestBboxData.bbox.Text;
        skeletonReference = skeletonUpdateBbox(skeletonReference, clientId, template._id, key.value, bestBboxData.bbox);
      }
    }
  });
  updateSkeleton(skeletonReference._id, skeletonReference)
  return newDocument;
}


module.exports = {
  createSkeleton,
  findSimilarSkeleton,
  populateOsmiumFromExactPrior,
  populateOsmiumFromFuzzyPrior,
};

/** **** ShapeOsmium ****
 *    Extract Metadata
 *    Search for similar (skeleton)                                                         #Algo 1   Done  Tested
 *    if ( skeleton.clientMapping(clientId).templateId exists)
 *      then { populate }                                                                   #Algo 2   Done
 *    else if (similar skeleton exists but from other client)
 *      then {
 *            do a bestGuessMapping between the 2 templateKeys                              #Algo 3   Done
 *            do populate                                                                   #Algo 2   Done
 *            do update skeletonData with new clientID_templateID mappings
 *           }
 *    else
 *      then {
 *              do bestGuessMapping between templateKeys and keysBoundingBoxes              #Algo 4
 *              do bestGuessMapping between keysBoundingBoxes and valuesBoundingBoxes       #Algo 5
 *              do populate                                                                 #Algo 2   
 *              do register the new Skeleton                                                #Algo 6   Done  Tested
 *              do update skeletonData with new clientID_templateID mappings
 *          }
 */


 /** **** updateOsmium ****
 * If value is changed
 *    Change Skeleton.HashMap<Client-Template-Tuple; Bbox-TemplateKey-Pair>
 */