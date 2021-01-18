// mbc for Memory B cells - this was coded in the coronaverse
const { Skeleton } = require('../models');
const { skeletonsMatch, getGeoClosestBoxScores, skeletonStoreClientTemplate, skeletonUpdateBbox } = require('../miner/skeletons')
const { mergeClientTemplateIds } = require('../utils/service.util')
const { getFilterById } = require('../services/filter.service');
const { updateSkeleton } = require('../services/skeleton.service');
const fuzz = require('fuzzball');
const munkres = require('munkres-js');

const findSimilarSkeleton = async (skeleton) => {
  const skeletons = await Skeleton.find();
  let foundMatch = false;
  let candidate = null;
  let index = 0;
  while(!foundMatch && index < skeletons.length) {
    candidate = skeletons[i];
    foundMatch = skeletonsMatch(skeleton, candidate);
    index++;
  }
  return candidate;
};

const buildKeysDistanceMatrix = (newTemplateKeys, refTemplateKeys) => {
  let matrix = [];
  newTemplateKeys.forEeach((newTemplateKey) => {
    let row = refTemplateKeys.map((refTemplateKey) => 100 - fuzz.ratio(newTemplateKey.value, refTemplateKey.value));
    matrix.push(row);
  })
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
  for (let i=0; i < templateKeysLength; i++) {
    if (i === munkresOutput[i][0]) {
      result.push(munkresOutput[i][1]);
    } else {
      result.push(undefined)
    }
  }
  return result
}


const getMostResemblantTemplate = (documentFilter, skeletonReference) => {
  let result = { key:'', template:'', indices: [] };
  let candidates = [] 
  let clientTemplateMap = skeletonReference.clientTemplateMapping;
  let bboxMap = skeletonReference.bboxMappings;
  for (let clientId in clientTemplateMap){
    for (let i=0; i<clientTemplateMap.get(clientId).length; i++){
      if (bboxMap.has(mergeClientTemplateIds(clientId, clientTemplateMap.get(clientId)))) {
        candidates.push({ key: mergeClientTemplateIds(clientId, clientTemplateMap.get(clientId)),
                          templateId: clientTemplateMap.get(clientId)[i],
                          templateKeys: extractTemplateKeysFromBBoxMap(bboxMap.get(mergeClientTemplateIds(clientId, clientTemplateMap.get(clientId))))
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
  const tempkeysToBoxMappingReference = skeletonReference.bboxMappings.get(bboxMappingKey);
  const docSkeleton = newDocument.metadata.page_1;
  filter.keys.map((key, index) => {
    let referenceBbox = tempkeysToBoxMappingReference.get(key.value);
    let bestBbox = getGeoClosestBoxScores(docSkeleton, referenceBbox);
    newDocument.osmium[index].Value = bestBbox.Text;
  })
  return newDocument;
}

const populateOsmiumFromFuzzyPrior = (documentBody, skeletonReference, template, clientId) => {
  const mostResemblantTemplateData = getMostResemblantTemplate(template, skeletonReference);
  skeletonReference = skeletonStoreClientTemplate(skeletonReference,clientId, template._id, template.keys)
  let newDocument = Object.assign({}, documentBody);
  const tempkeysToBoxMappingReference = skeletonReference.bboxMappings.get(mostResemblantTemplateData.key);
  const docSkeleton = newDocument.metadata.page_1;
  template.keys.map((key, index) => {
    let matchedIndex = mostResemblantTemplateData.indices[index]
    if (matchedIndex) {
      let matchedKey = mostResemblantTemplateData.template.keys[matchedIndex]
      let referenceBbox = tempkeysToBoxMappingReference.get(matchedKey.value);
      let bestBbox = getGeoClosestBoxScores(docSkeleton, referenceBbox);
      newDocument.osmium[index].Value = bestBbox.Text;
      skeletonReference = skeletonUpdateBbox(skeletonReference, clientId, template._id, key.value, bestBbox);
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
 *    Search for similar (skeleton)                                                         #Algo 1   Done     
 *    if ( skeleton.clientMapping(clientId).templateId exists)
 *      then { populate }                                                                   #Algo 2
 *    else if (similar skeleton exists but from other client)
 *      then {
 *            do a bestGuessMapping between the 2 templateKeys                              #Algo 3
 *            do populate                                                                   #Algo 2
 *            do update skeletonData with new clientID_templateID mappings
 *           }
 *    else
 *      then {
 *              do bestGuessMapping between templateKeys and keysBoundingBoxes              #Algo 4
 *              do bestGuessMapping between keysBoundingBoxes and valuesBoundingBoxes       #Algo 5
 *              do populate                                                                 #Algo 2   
 *              do register the new Skeleton                                                #Algo 6   Done
 *              do update skeletonData with new clientID_templateID mappings
 *          }
 */


 /** **** updateOsmium ****
 * If value is changed
 *    Change Skeleton.HashMap<Client-Template-Tuple; Bbox-TemplateKey-Pair>
 */