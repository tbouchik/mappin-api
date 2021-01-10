// mbc for Memory B cells - this was coded in the coronaverse
const { Skeleton } = require('../models');
const { skeletonsMatch, getGeoClosestBoxScores } = require('../miner/skeletons')
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
  const bboxMappingKey = mergeClientTemplateIds(newDocument.user, newDocument.filter)
  const tempkeysToBoxMappingReference = skeletonReference.bboxMappings.get(bboxMappingKey)
  const docSkeleton = newDocument.metadata.page_1;
  filter.keys.map((key, index) => {
    let referenceBbox = tempkeysToBoxMappingReference.get(key.value);
    let bestBbox = getGeoClosestBoxScores(docSkeleton, referenceBbox);
    console.log("Scanning for item: ", key.value)
    console.log("Best bbox found score:   ", bestBbox)
    console.log("------------------------------------")
    newDocument.osmium[index].Value = bestBbox.Text 
  })
}

const populateOsmiumFromFuzzyPrior = (documentBody, skeletonReference, filter) => {
  return {};
}

const populateOsmiumFromOtherClientPrior = (documentBody, skeletonReference, filter) => {
  return {};
}

module.exports = {
  createSkeleton,
  findSimilarSkeleton,
  populateOsmiumFromExactPrior,
  populateOsmiumFromFuzzyPrior,
  populateOsmiumFromOtherClientPrior,
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