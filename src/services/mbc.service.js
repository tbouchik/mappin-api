// mbc for Memory B cells - this was coded in the coronaverse
const { Skeleton } = require('../models');
const { skeletonsMatch } = require('../miner/skeletons')
const { mergeClientTemplateIds } = require('../utils/service.util')
const { getFilterById } = require('../services/filter.service');
const { stackTraceLimit } = require('../utils/AppError');

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

const createSkeleton = async (user, payload) => {
  let clientTemplateMapping = new Map(); //used Map instead of Object because the keys of an Object must be either a String or a Symbol.
  clientTemplateMapping[user._id] = payload.filter;
  let template = await getFilterById(user, payload.filter, true);
  let templateKeyBBoxMappingArr = []
  for (elt in template.keys){
    templateKeyBBoxMappingArr.push([elt.value , null])
  }
  let templateKeyBBoxMapping = new Map(templateKeyBBoxMappingArr) // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#relation_with_array_objects
  let bboxMappings = new Map();
  bboxMappings[mergeClientTemplateIds(user._id, payload.filter)] = templateKeyBBoxMapping;
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

const populateOsmium = (documentBody) => {
  return {};
}

module.exports = {
  createSkeleton,
  findSimilarSkeleton,
  populateOsmium,
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
 *           }
 *    else
 *      then {
 *              do bestGuessMapping between templateKeys and keysBoundingBoxes              #Algo 4
 *              do bestGuessMapping between keysBoundingBoxes and valuesBoundingBoxes       #Algo 5
 *              do populate                                                                 #Algo 2
 *              do register the new Skeleton                                                #Algo 6 
 *          } 
 */


 /** **** updateOsmium ****
 * If value is changed
 *    Change Skeleton.HashMap<Client-Template-Tuple; Bbox-TemplateKey-Pair>
 */