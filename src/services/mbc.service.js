// mbc for Memory B cells - this was coded in the coronaverse
const { Skeleton } = require('../models');
const { skeletonsMatch, getGeoClosestBoxScores } = require('../miner/skeletons')
const { mergeClientTemplateIds } = require('../utils/service.util')
const { getFilterById } = require('../services/filter.service');
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

const bindTemplateKeys = (newTemplate, refTemplate) => {
  let distanceMatrix = buildKeysDistanceMatrix(newTemplate.keys, refTemplate.keys);
  let mapping =  munkres(distanceMatrix);
  let result = [];
  for (let i=0; i < newTemplate.keys.length; i++) {
    if (i === mapping[i][0]) {
      result.push(mapping[i][1]);
    } else {
      result.push(undefined)
    }
  }
  return result
}

const getMostResemblantTemplate = (documentFilter, skeletonReference) => {
  let result = {key:'', template:''};
  return result
};

const createSkeleton = async (user, payload) => {
  let clientTemplateMapping = new Map(); //used Map instead of Object because the keys of an Object must be either a String or a Symbol.
  clientTemplateMapping.set(user.id,  payload.filter);
  let template = await getFilterById(user, payload.filter, true);
  let templateKeyBBoxMappingArr = []
  for (elt in template.keys){
    templateKeyBBoxMappingArr.push([elt.value , null])
  }
  let templateKeyBBoxMapping = new Map(templateKeyBBoxMappingArr) // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#relation_with_array_objects
  let bboxMappings = new Map();
  bboxMappings.set(mergeClientTemplateIds(user.id, payload.filter) , templateKeyBBoxMapping);
  const skeletonBody = {
    ossature: payload.metadata.page_1,
    accountingNumber: 000000,
    document: payload._id,
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

const populateOsmiumFromFuzzyPrior = (documentBody, skeletonReference, filter) => {
  const mostResemblantTemplateData = getMostResemblantTemplate(filter, skeletonReference);
  const matchedTemplateData = bindTemplateKeys(filter, mostResemblantTemplateData.template);
  let newDocument = Object.assign({}, documentBody);
  const tempkeysToBoxMappingReference = skeletonReference.bboxMappings.get(mostResemblantTemplateData.key);
  const docSkeleton = newDocument.metadata.page_1;
  filter.keys.map((key, index) => {
    let matchedIndex = matchedTemplateData[index]
    if (matchedIndex) {
      let matchedKey = mostResemblantTemplateData.template.keys[matchedIndex]
      let referenceBbox = tempkeysToBoxMappingReference.get(matchedKey.value);
      let bestBbox = getGeoClosestBoxScores(docSkeleton, referenceBbox);
      newDocument.osmium[index].Value = bestBbox.Text;
    }
  });
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