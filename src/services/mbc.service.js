// mbc for Memory B cells - this was coded in the coronaverse
const { Skeleton } = require('../models');
const { skeletonsMatch, getGeoClosestBoxScores, skeletonStoreClientTemplate, skeletonUpdateBbox, prepareSkeletonMappingsForApi } = require('../miner/skeletons')
const { mergeClientTemplateIds, formatValue, mapToObject, objectToMap } = require('../utils/service.util')
const { getFilterById } = require('../services/filter.service');
const { updateSkeleton, getSkeletonById } = require('../services/skeleton.service');
const { skeletonHasClientTemplate } = require('../miner/skeletons');
const { ggMetadataHasSimilarKey, ggMetadataHasSimilarTag } = require('../utils/tinder');
const { findTemplateKeyFromTag } = require('./../miner/template');
const { isEmpty } = require('lodash');
const fuzz = require('fuzzball');
const munkres = require('munkres-js');
const labels = require('./../../ressources/labels');

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


const findGgMappingKey = (templateKey, osmium, ggMetadata) => {
  let result = null;
  let osmiumItem = osmium.find(x => x.Key === templateKey.value);
  let osmiumItemValue = osmiumItem ? osmiumItem.Value : null;
  if (osmiumItemValue) {
    let ggMetadataKeys = Object.keys(ggMetadata)
    for (let i = 0; i < ggMetadataKeys.length; i++) {
      let key = ggMetadataKeys[i];
      if( formatValue(ggMetadata[key].Text, templateKey.type)=== formatValue(osmiumItemValue, templateKey.type)) {
        result = key;
        break;
      }
    }
  }
  return result;
}

const findGgMappingKeyFromMBC = (templateKeys, ggMetadata, mbc) => {
  let result = null;
  let templateKeytext = Object.keys(mbc)[0];
  const templateKey = templateKeys.find(x => x.value === templateKeytext);
  if (templateKey) {
    let ggMetadataEntries = Object.entries(ggMetadata).map(x => {return {key: x[0], value:x[1]? x[1].Text:null}});
    let formattedtemplateKeyValue = formatValue(Object.values(mbc)[0].Text, templateKey.type);
    let tinderScores = ggMetadataEntries.map(x => {return {...x, score: fuzz.ratio(x.value, formattedtemplateKeyValue)}})
    tinderScores.sort((a,b) => {
      if ( a.score < b.score ){
        return +1;
      }
      if ( a.score > b.score ){
        return -1;
      }
      return 0;
    })
    let tmpresult =       new Map()
    tmpresult.set(templateKey.value, tinderScores[0].score > 65 ? tinderScores[0].key: null);
    result = mapToObject(tmpresult);  
  }
  return result;
}

const createSkeleton = async (user, docBody, docId) => {
  let clientTemplateMapping = new Map();
  clientTemplateMapping.set(user.id,  [docBody.filter.toString()]);
  let template = await getFilterById(user, docBody.filter, true);
  let templateKeyBBoxMappingArr = []
  for (let i=0; i < template.keys.length; i++) {
    templateKeyBBoxMappingArr.push([template.keys[i].value , null])
  }
  let templateKeyBBoxMapping = new Map(templateKeyBBoxMappingArr) // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#relation_with_array_objects
  let bboxMappings = new Map();
  bboxMappings.set(mergeClientTemplateIds(user.id, docBody.filter) , Object.fromEntries(templateKeyBBoxMapping));
  let templateKeyGgMappingArr = [];
  for (let i= 0; i < template.keys.length; i++) {
    let elementMapped = findGgMappingKey(template.keys[i], docBody.osmium, docBody.ggMetadata);
    templateKeyGgMappingArr.push([template.keys[i].value , elementMapped]);
  }
  let templateKeyGgMapping = new Map(templateKeyGgMappingArr);
  let ggMappings = new Map();
  ggMappings.set(mergeClientTemplateIds(user.id, docBody.filter) , Object.fromEntries(templateKeyGgMapping));
  let imputations = new Map ();
  imputations.set(mergeClientTemplateIds(user.id, docBody.filter) , Object.fromEntries(templateKeyBBoxMapping));
  const skeletonBody = {
    ossature: docBody.metadata.page_1,
    document: docId,
    imputations,
    clientTemplateMapping,
    ggMappings,
    bboxMappings,
  }
  const skeleton = await Skeleton.create(skeletonBody);
  return skeleton;
};

const populateOsmiumFromExactPrior = (documentBody, skeletonReference, template) => {
  let skeletonRef = prepareSkeletonMappingsForApi(skeletonReference)
  let newDocument = Object.assign({}, documentBody);
  const bboxMappingKey = mergeClientTemplateIds(newDocument.user, newDocument.filter);
  let bboxMappings = skeletonRef.bboxMappings.get(bboxMappingKey);
  let ggMappings = skeletonRef.ggMappings.get(bboxMappingKey);
  let imputations = skeletonRef.imputations.get(bboxMappingKey);
  bboxMappings = objectToMap(bboxMappings);
  ggMappings = objectToMap(ggMappings);
  imputations = objectToMap(imputations);
  const docSkeleton = newDocument.metadata.page_1;
  for (let i = 0; i <template.keys.length; i++) {
    let key = template.keys[i];
    let ggKey = ggMappings.get(key.value);
    if (imputations.get(key.value)!== undefined && imputations.get(key.value)!== null) {
      newDocument.osmium[i].Imputation = imputations.get(key.value)
      newDocument.osmium[i].Libelle = labels[parseInt(imputations.get(key.value))]
    }
    let matchedGgKey =  ggMetadataHasSimilarKey(documentBody.ggMetadata, ggKey)
    if (matchedGgKey !== null && matchedGgKey !== undefined) {
      newDocument.osmium[i].Value = formatValue(documentBody.ggMetadata[matchedGgKey].Text, key.type);
    } else{
      let referenceBbox = bboxMappings.get(key.value);
      if (referenceBbox) {
        let bestBbox = getGeoClosestBoxScores(docSkeleton, referenceBbox);
        newDocument.osmium[i].Value = bestBbox !== undefined ? formatValue(bestBbox.bbox.Text, key.type) : null;
      } else {
        const bestGgKeyMatch = ggMetadataHasSimilarTag(documentBody.ggMetadata, key.tags);
        if (bestGgKeyMatch){
          newDocument.osmium[i].Value = formatValue(documentBody.ggMetadata[bestGgKeyMatch].Text, key.type);
        }
      }
    }
  }
  return newDocument;
}


const populateOsmiumFromFuzzyPrior = (documentBody, skeletonReference, template, clientId) => {
  const mostResemblantTemplateData = getMostResemblantTemplate(template, skeletonReference);
  skeletonReference = skeletonStoreClientTemplate(skeletonReference,clientId, template.id, template.keys);
  let newDocument = Object.assign({}, documentBody);
  const tempkeysToBoxMappingReference = skeletonReference.bboxMappings.get(mostResemblantTemplateData.key);
  const tempkeysToGGMappingReference = skeletonReference.ggMappings.get(mostResemblantTemplateData.key);
  const docSkeleton = newDocument.metadata.page_1;
  template.keys.map((key, index) => {

    let matchedIndex = mostResemblantTemplateData.indices[index];
    if (matchedIndex !== undefined) {
      if (key.type === 'IMPUT') {
        newDocument.osmium[index].Value = skeletonReference.imputations.get(mostResemblantTemplateData.key);
      } else if (!newDocument.osmium[index].Value){
        let matchedKey = mostResemblantTemplateData.template[matchedIndex];
        let referenceGGKey = tempkeysToGGMappingReference[matchedKey.value];
        let matchedGgKey = ggMetadataHasSimilarKey(newDocument.ggMetadata, referenceGGKey)
        if (matchedGgKey !== null && matchedGgKey!== undefined ) {
          newDocument.osmium[index].Value =formatValue(newDocument.ggMetadata[referenceGGKey].Text, key.type);
        } else {
          let referenceBbox = tempkeysToBoxMappingReference[matchedKey.value];
          if (referenceBbox) {
            let bestBboxData = getGeoClosestBoxScores(docSkeleton, referenceBbox);
            newDocument.osmium[index].Value = formatValue(bestBboxData.bbox.Text, key.type);
            skeletonReference = skeletonUpdateBbox(skeletonReference, clientId, template._id, key.value, bestBboxData.bbox);
          }
        }
      }
    }
  });
  updateSkeleton(skeletonReference._id, skeletonReference)
  return newDocument;
}

updateSkeletonFromDocUpdate = async (user, updateBody, template, mbc) => {
  const skeleton = await getSkeletonById(updateBody.skeleton);
  const clientTempKey = mergeClientTemplateIds(user.id, updateBody.filter.id);
  if (mbc && !isEmpty(mbc)){
    if (skeleton._id.equals(updateBody.skeleton)){
      if (skeletonHasClientTemplate(skeleton, user.id, updateBody.filter.id)) {
       let newBboxMappings = skeleton.bboxMappings.get(clientTempKey);
       newBboxMappings = Object.assign(newBboxMappings, mbc);
       skeleton.bboxMappings.set(clientTempKey, newBboxMappings);
       let newGgMappings = skeleton.ggMappings.get(clientTempKey);
       let ggMatchedResult = findGgMappingKeyFromMBC(template.keys, updateBody.ggMetadata, mbc);
       newGgMappings = Object.assign(newGgMappings, ggMatchedResult);
       skeleton.ggMappings.set(clientTempKey, mapToObject(newGgMappings));
       let result = await updateSkeleton(skeleton._id, skeleton);
       return result;
      }
    }
  } else if(updateBody.imput && updateBody.osmium !== undefined){
    const skeleton = await getSkeletonById(updateBody.skeleton);
    if (skeleton._id.equals(updateBody.skeleton)){
      if (skeletonHasClientTemplate(skeleton, user.id, updateBody.filter.id)) {
        let newImputationMappings = skeleton.imputations.get(clientTempKey);
        let imputableTemplateKeysIndices = template.keys
                                            .map((x, i) => {if (x.isImputable) return i})
                                            .filter(x => x!== undefined)
        imputableTemplateKeysIndices.forEach(idx => {
          newImputationMappings[template.keys[idx].value] = updateBody.osmium[idx].Imputation;
        })
        skeleton.imputations.set(clientTempKey, mapToObject(newImputationMappings));
        let result = await updateSkeleton(skeleton._id, skeleton);
        return result;
      }
    }
  } else {
    return skeleton;
  }
};

module.exports = {
  createSkeleton,
  findSimilarSkeleton,
  populateOsmiumFromExactPrior,
  populateOsmiumFromFuzzyPrior,
  findGgMappingKeyFromMBC,
  updateSkeletonFromDocUpdate,
};

/** **** ShapeOsmium ****
 *    Extract AWSMetadata
 *    Extract GCSMetadata
 *    Search for similar (skeleton)                                                         #Algo 1   Done  Tested
 *    if ( similar skeleton exists for same client & same tamplate)
 *      then { populate }                                                                   #Algo 2   Done  Tested
 *    else if (similar skeleton exists but from other client)
 *      then {
 *            do a bestGuessMapping between the 2 templateKeys                              #Algo 3   Done  Tested
 *            do populate                                                                   #Algo 2   Done  Tested
 *            do update skeletonData with new clientID_templateID mappings                  #Algo 7   Done  Tested
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
 *    Change Skeleton.BBoxMapings<Client-Template-Tuple; Bbox-TemplateKey-Pair>
 *    Change Skeleton.GGMappings<Client-Template-Tuple; Bbox-TemplateKey-Pair>
 */