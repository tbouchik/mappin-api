// mbc for Memory B cells - this was coded in the coronaverse
const { Skeleton } = require('../models');
const { skeletonsMatch, getGeoClosestBoxScores, skeletonStoreClientTemplate, getSignatureFromOssature, skeletonUpdateBbox, skeletonUpdateGgMapping, prepareSkeletonMappingsForApi } = require('../miner/skeletons')
const { mergeClientTemplateIds, formatValue, mapToObject, objectToMap } = require('../utils/service.util')
const { getFilterById } = require('../services/filter.service');
const { updateSkeleton, getSkeletonById } = require('../services/skeleton.service');
const { skeletonHasClientTemplate } = require('../miner/skeletons');
const { identifyRole, templateKeyoneToOneCompare } = require('./../miner/template');
const { ggMetadataHasSimilarKey, ggMetadataHasSimilarTag } = require('../utils/tinder');
const { isEmpty, get, pick, omit } = require('lodash');
const fuzz = require('fuzzball');
const munkres = require('munkres-js');


const findSimilarSkeleton = async (ossature) => {
  const skeletons = await Skeleton.find();
  let foundMatch = false;
  let candidate = null;
  let index = 0;
  while(!foundMatch && index < skeletons.length) {
    candidate = skeletons[index];
    foundMatch = skeletonsMatch(ossature, candidate.ossature);
    index++;
  }
  return foundMatch === true? candidate : null;
};

const buildKeysDistanceMatrix = (newTemplateKeys, refTemplateKeys) => {
  let matrix = [];
  for (let i = 0; i < newTemplateKeys.length; i++) {
    let newTemplateKey = newTemplateKeys[i];
    let row = refTemplateKeys.map((refTemplateKey) => 100 - templateKeyoneToOneCompare(newTemplateKey, refTemplateKey));
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


const getMostResemblantTemplate = async (user, documentFilter, skeletonReference) => {
  let result = { key:'', template:'', indices: [] };
  let candidates = [] 
  let clientTemplateMap = skeletonReference.clientTemplateMapping;
  let bboxMap = skeletonReference.bboxMappings;
  for (let [clientId, templateIdArrays] of clientTemplateMap) {
    for (let i=0; i<templateIdArrays.length; i++){
      let templateId = templateIdArrays[i]
      if (skeletonHasClientTemplate(skeletonReference,clientId,templateId)) {
        let clientTempKey = mergeClientTemplateIds(clientId, templateId);
        const refTemplate = await getFilterById(user, templateId, true);
        candidates.push({ key: clientTempKey,
                          templateId: templateId,
                          templateKeys: refTemplate.keys
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


const findGgMappingKey = (templateKey, docBody) => {
  let result = null;
  let {osmium, ggMetadata} = docBody
  if (osmium === undefined) {
    let itemValue = docBody[templateKey.value]
    if (itemValue) {
      let ggMetadataKeys = Object.keys(ggMetadata)
      for (let i = 0; i < ggMetadataKeys.length; i++) {
        let key = ggMetadataKeys[i];
        if( formatValue(ggMetadata[key].Text, templateKey.type, null, false)=== formatValue(itemValue, templateKey.type, null, false)) {
          result = key;
          break;
        }
      }
    }
  } else {
    let osmiumItem = osmium.find(x => x.Key === templateKey.value);
    let osmiumItemValue = osmiumItem ? osmiumItem.Value : null;
    if (osmiumItemValue) {
      let ggMetadataKeys = Object.keys(ggMetadata)
      for (let i = 0; i < ggMetadataKeys.length; i++) {
        let key = ggMetadataKeys[i];
        if( formatValue(ggMetadata[key].Text, templateKey.type, null, false)=== formatValue(osmiumItemValue, templateKey.type, null, false)) {
          result = key;
          break;
        }
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
    let formattedtemplateKeyValue = formatValue(Object.values(mbc)[0].Text, templateKey.type, null, false);
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
    let tmpresult =  new Map()
    tmpresult.set(templateKey.value, tinderScores[0].score > 60 ? tinderScores[0].key: null);
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
    let elementMapped = findGgMappingKey(template.keys[i], docBody);
    templateKeyGgMappingArr.push([template.keys[i].value , elementMapped]);
  }
  let templateKeyGgMapping = new Map(templateKeyGgMappingArr);
  let ggMappings = new Map();
  ggMappings.set(mergeClientTemplateIds(user.id, docBody.filter) , Object.fromEntries(templateKeyGgMapping));
  let imputations = new Map ();
  imputations.set(mergeClientTemplateIds(user.id, docBody.filter) , Object.fromEntries(templateKeyBBoxMapping));
  const signature = getSignatureFromOssature(get(docBody, 'metadata.page_1', {}))
  const skeletonBody = {
    ossature: get(docBody, 'metadata.page_1', {}),
    document: docId,
    isBankSkeleton: docBody.isBankStatement,
    imputations,
    clientTemplateMapping,
    ggMappings,
    bboxMappings,
    signature,
  }
  const skeleton = await Skeleton.create(skeletonBody);
  return skeleton;
};

const populateOsmiumFromExactPrior = (documentBody, skeletonReference, template, roles) => {
  let skeletonRef = prepareSkeletonMappingsForApi(skeletonReference)
  let newDocument = Object.assign({}, documentBody);
  const bboxMappingKey = mergeClientTemplateIds(newDocument.user, newDocument.filter);
  let bboxMappings = skeletonRef.bboxMappings.get(bboxMappingKey);
  let ggMappings = skeletonRef.ggMappings.get(bboxMappingKey);
  let imputations = skeletonRef.imputations.get(bboxMappingKey);
  bboxMappings = objectToMap(bboxMappings);
  ggMappings = objectToMap(ggMappings);
  imputations = objectToMap(imputations);
  const docSkeleton = get(newDocument, 'metadata.page_1', {});
  for (let i = 0; i <template.keys.length; i++) {
    let key = template.keys[i];
    let currentRole = identifyRole(template, i);
    if (roles && !isEmpty(roles)) {
      newDocument = setRolesInDocument(newDocument, roles);
    }
    let ggKey = ggMappings.get(key.value);
    if (imputations.get(key.value)!== undefined && imputations.get(key.value)!== null) {
      newDocument.osmium[i].Imputation = imputations.get(key.value);
    }
    if ((currentRole) && (currentRole === 'vendor' || currentRole === 'bankEntity')) {
        newDocument.osmium[i].Value = skeletonReference[currentRole];
        newDocument[currentRole] = skeletonReference[currentRole];
    } else {
      let matchedGgKey =  ggMetadataHasSimilarKey(documentBody.ggMetadata, ggKey);
      if (matchedGgKey !== null && matchedGgKey !== undefined) {
        newDocument.osmium[i].Value = formatValue(documentBody.ggMetadata[matchedGgKey].Text, key.type, currentRole, false);
        if (currentRole) {
          newDocument[currentRole] = formatValue(documentBody.ggMetadata[matchedGgKey].Text, key.type, currentRole, true);
        }
      } else {
        let referenceBbox = bboxMappings.get(key.value);
        if (referenceBbox) {
          let bestBbox = getGeoClosestBoxScores(docSkeleton, referenceBbox);
          newDocument.osmium[i].Value = bestBbox !== undefined ? formatValue(bestBbox.bbox.Text, key.type, currentRole, false) : null;
          if (currentRole) {
            newDocument[currentRole] = bestBbox !== undefined ? formatValue(bestBbox.bbox.Text, key.type, currentRole, true) : null;
          }
        } else {
          const bestGgKeyMatch = ggMetadataHasSimilarTag(documentBody.ggMetadata, key.tags);
          if (bestGgKeyMatch){
            newDocument.osmium[i].Value = formatValue(documentBody.ggMetadata[bestGgKeyMatch].Text, key.type, currentRole, false);
            if (currentRole) {
              newDocument[currentRole] = formatValue(documentBody.ggMetadata[bestGgKeyMatch].Text, key.type, currentRole, true);
            }
          }
        }
      }
    }
  }
  return newDocument;
}

const populateInvoiceDataFromExactPrior = (documentBody, skeletonReference, template) => {
  let skeletonRef = prepareSkeletonMappingsForApi(skeletonReference)
  let newDocument = Object.assign({}, documentBody);
  const bboxMappingKey = mergeClientTemplateIds(newDocument.user, newDocument.filter);
  let bboxMappings = skeletonRef.bboxMappings.get(bboxMappingKey);
  let ggMappings = skeletonRef.ggMappings.get(bboxMappingKey);
  let imputations = skeletonRef.imputations.get(bboxMappingKey);
  bboxMappings = objectToMap(bboxMappings);
  ggMappings = objectToMap(ggMappings);
  imputations = objectToMap(imputations);
  for (let i = 0; i <template.keys.length; i++) {
    let key = template.keys[i];
    if (key.value === "vendor") {
      newDocument[key.value] = skeletonRef.vendor
    } else {
      let ggKey = ggMappings.get(key.value);
      let matchedGgKey =  ggMetadataHasSimilarKey(documentBody.ggMetadata, ggKey)
      if (matchedGgKey !== null && matchedGgKey !== undefined) {
        newDocument[key.value] = formatValue(documentBody.ggMetadata[matchedGgKey].Text, key.type, null, false);
      } else {
        let referenceBbox = bboxMappings.get(key.value);
        if (referenceBbox) {
          const docSkeleton = get(newDocument, 'metadata.page_1', {});
          let bestBbox = getGeoClosestBoxScores(docSkeleton, referenceBbox);
          newDocument[key.value] = bestBbox !== undefined ? formatValue(bestBbox.bbox.Text, key.type, null, false) : null;
        } else {
          const bestGgKeyMatch = ggMetadataHasSimilarTag(documentBody.ggMetadata, key.tags);
          if (bestGgKeyMatch){
            newDocument[key.value] = formatValue(documentBody.ggMetadata[bestGgKeyMatch].Text, key.type, null, false);
          }
        }
      }
    }
  }
  return newDocument;
}


const populateOsmiumFromFuzzyPrior = async (documentBody, skeletonReference, template, user) => {
  const mostResemblantTemplateData = await getMostResemblantTemplate(user, template, skeletonReference);
  const referenceBboxMappings = skeletonReference.bboxMappings.get(mostResemblantTemplateData.key);
  const referenceGgMappings = skeletonReference.ggMappings.get(mostResemblantTemplateData.key);
  skeletonReference = skeletonStoreClientTemplate(skeletonReference,user.id, template.id, template.keys);
  for (let i= 0; i < template.keys.length; i++) {
    let currentRole = identifyRole(template, i);
    if ((currentRole) && (currentRole === 'vendor' || currentRole === 'bankEntity')) {
      documentBody.osmium[i].Value = skeletonReference[currentRole];
      documentBody[currentRole] = skeletonReference[currentRole];
    } else {
      let matchedReferenceTemplateKeyIdx = mostResemblantTemplateData.indices[i];
      if (matchedReferenceTemplateKeyIdx !== undefined) {
        let matchedReferenceTemplateKey = mostResemblantTemplateData.template[matchedReferenceTemplateKeyIdx];
        let referenceGGKey = referenceGgMappings[matchedReferenceTemplateKey.value];
        let matchedGgKey = ggMetadataHasSimilarKey(documentBody.ggMetadata, referenceGGKey)
        if (matchedGgKey ) {
          documentBody.osmium[i].Value = formatValue(documentBody.ggMetadata[matchedGgKey].Text, template.keys[i].type, null, false);
          if (currentRole) {
            documentBody[currentRole] = formatValue(documentBody.ggMetadata[matchedGgKey].Text, template.keys[i].type, null, true);
          }
          skeletonReference = skeletonUpdateGgMapping(skeletonReference, user.id, template.id, template.keys[i].value, matchedGgKey)
        } else {
          let referenceBbox = referenceBboxMappings[matchedReferenceTemplateKey.value];
          let bestBboxData = referenceBbox ? getGeoClosestBoxScores(documentBody.metadata.page_1, referenceBbox): null;
          if (bestBboxData && bestBboxData.geoSimilitude > 0) {
            documentBody.osmium[i].Value = formatValue(bestBboxData.bbox.Text, template.keys[i].type, null, false);
            if (currentRole) {
              documentBody[currentRole] = formatValue(bestBboxData.bbox.Text, template.keys[i].type, null, true);
            }
            skeletonReference = skeletonUpdateBbox(skeletonReference, user.id, template.id, template.keys[i].value, bestBboxData.bbox)
          }
        }
      }
    }
  }
  updateSkeleton(skeletonReference._id, skeletonReference)
  return documentBody;
}

const updateSkeletonFromDocUpdate = async (user, updateBody, template, mbc, updatedRoles) => {
  const skeleton = await getSkeletonById(updateBody.skeleton);
  Object.assign(skeleton, updatedRoles);
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
       let updatedSkeleton = await updateSkeleton(skeleton._id, skeleton);
       return updatedSkeleton;
      }
    }
  } else if(updateBody.imput && updateBody.osmium !== undefined){
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
        let updatedSkeleton = await updateSkeleton(skeleton._id, skeleton);
        return updatedSkeleton;
      }
    }
  } else {
    let updatedSkeleton = await updateSkeleton(skeleton._id, skeleton);
    return updatedSkeleton;
  }
};

updateSkeletonFromInvoiceUpdate = async (user, invoice, template, updateBody) => {
  const skeleton = await getSkeletonById(invoice.skeleton);
  Object.assign(skeleton, pick(updateBody, 'vendor'));
  const clientTempKey = mergeClientTemplateIds(user.id, invoice.filter);
  if (skeletonHasClientTemplate(skeleton, user.id, invoice.filter)) {
    let newGgMappings = skeleton.ggMappings.get(clientTempKey);
    let ggMatchedResult = findGgMappingKeys(template.keys, invoice.ggMetadata, updateBody);
    if (ggMatchedResult){
      ggMatchedResult = omit(ggMatchedResult, ['vendor'])
      newGgMappings = Object.assign(newGgMappings, ggMatchedResult);
      skeleton.ggMappings.set(clientTempKey, mapToObject(newGgMappings));
    }
    let updatedSkeleton = await updateSkeleton(skeleton._id, skeleton);
    return updatedSkeleton;
  }
  return skeleton;
};

const findGgMappingKeys = (templateKeys, ggMetadata, updateBody) => { // updateBody {totalTtc: €10.50, vendor: "Carrefour"}
  let result = {};
  let updatedKeys = Object.keys(updateBody);
  const updatedTemplateKeys = templateKeys.filter(x => updatedKeys.includes(x.value));
  if (updatedTemplateKeys && updatedTemplateKeys.length > 0) {
    let ggMetadataEntries = Object.entries(ggMetadata).map(x => {return {key: x[0], value:x[1]? x[1].Text:null}});
    let updatedEntries = Object.entries(updateBody);
    updatedEntries.forEach((updatedEntry) => {
      let updatedKey = updatedEntry[0];
      let updatedValue = updatedEntry[1];
      let tinderScores = ggMetadataEntries.map(x => {return {...x, score: fuzz.ratio(x.value, updatedValue)}})
      tinderScores.sort((a,b) => {
        if ( a.score < b.score ){
          return +1;
        }
        if ( a.score > b.score ){
          return -1;
        }
        return 0;
      })
      let tmpresult = new Map()
      tmpresult.set(updatedKey, tinderScores[0].score > 65 ? tinderScores[0].key: null);
      Object.assign(result, mapToObject(tmpresult));  
    })
  }
  return result;
}

const setRolesInDocument = (documentBody, roles) => {
  if(roles && Object.keys(roles)[0] === 'vendor') {
    let newDocument = Object.assign({}, documentBody);
    newDocument.vendor = roles.vendor
    return newDocument
  } else if (roles && Object.keys(roles)[0] === 'bankEntity') {
    let newDocument = Object.assign({}, documentBody);
    newDocument.bankEntity = roles.bankEntity
    return newDocument
  }
  return documentBody
}


module.exports = {
  createSkeleton,
  findSimilarSkeleton,
  populateOsmiumFromExactPrior,
  populateOsmiumFromFuzzyPrior,
  findGgMappingKeyFromMBC,
  populateInvoiceDataFromExactPrior,
  updateSkeletonFromDocUpdate,
  updateSkeletonFromInvoiceUpdate,
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