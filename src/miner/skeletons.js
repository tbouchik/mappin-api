const fuzz = require('fuzzball');
const moment = require('moment');
const turf = require("@turf/turf");
const { pick } = require('lodash');
const { RegexType, SignatureMatchRating, objectToMap, mapToObject } = require('../utils/service.util');
const { mergeClientTemplateIds } = require('../utils/service.util');
const munkres = require('munkres-js');

const skeletonsMatch = (skeleton1, skeleton2) => {
  skeleton1 = skeleton1.sort((a, b) => (a.Top > b.Top) ? 1 : (a.Top === b.Top) ? ((a.size > b.size) ? 1 : -1) : -1  )
  skeleton2 = skeleton2.sort((a, b) => (a.Top > b.Top) ? 1 : (a.Top === b.Top) ? ((a.size > b.size) ? 1 : -1) : -1  )
  const topSignature1 = getSkeletonTopSignature(skeleton1);
  const topSignature2 = getSkeletonTopSignature(skeleton2);
  const topSignaturesMatchRating = compareTwoSkeletonSignatures(topSignature1, topSignature2)
  if (topSignaturesMatchRating === SignatureMatchRating.EXCELLENT) {
    return true;
  } else if (topSignaturesMatchRating === SignatureMatchRating.SHAKY) {
    const bottomSignature1 = getSkeletonBottomSignature(skeleton1);
    const bottomSignature2 = getSkeletonBottomSignature(skeleton2);
    const bottomSignaturesMatchRating = compareTwoSkeletonSignatures(bottomSignature1, bottomSignature2)
    return bottomSignaturesMatchRating === SignatureMatchRating.EXCELLENT;
  } 
  return false;
}

const compareTwoSkeletonSignatures = (ske1, ske2) => {
  let textSig1 = [];
  let textSig2 = [];
  for (let i = 0; i< Math.min(ske1.length, ske2.length); i++ ) {
    textSig1.push(ske1[i].Text);
    textSig2.push(ske2[i].Text);
  }
  let grade = gradeTextSimilitude(textSig1, textSig2);
  if (grade > 75) {
    return SignatureMatchRating.EXCELLENT
  }
  else if (grade <= 75 && grade > 45) {
    return SignatureMatchRating.SHAKY
  }
  return SignatureMatchRating.BAD
}

const getBboxCoordinates = (bbox) => {
  const topLeft = [parseFloat(bbox.Left), parseFloat(bbox.Top)];
  const topRight = [parseFloat(bbox.Left) + parseFloat(bbox.Width) , parseFloat(bbox.Top)];
  const bottomLeft = [parseFloat(bbox.Left), parseFloat(bbox.Top) + parseFloat(bbox.Height)];
  const bottomRight = [parseFloat(bbox.Left) + parseFloat(bbox.Width), parseFloat(bbox.Top) + parseFloat(bbox.Height)];
  return [topLeft, topRight, bottomRight, bottomLeft, topLeft];
}

const getGgBboxCoordinates = (bbox) => {
  const topLeft = {x:parseFloat(bbox.Left), y: parseFloat(bbox.Top)};
  const topRight = {x:parseFloat(bbox.Left) + parseFloat(bbox.Width), y: parseFloat(bbox.Top)};
  const bottomLeft = {x:parseFloat(bbox.Left), y: parseFloat(bbox.Top) + parseFloat(bbox.Height)};
  const bottomRight = {x:parseFloat(bbox.Left) + parseFloat(bbox.Width), y: parseFloat(bbox.Top) + parseFloat(bbox.Height)};
  return [topLeft, topRight, bottomRight, bottomLeft];
}

const getBBoxArea = (bbox) => {
  const coords = [getBboxCoordinates(bbox)];
  const poly = turf.polygon(coords);
  return turf.area(poly);
}

const getTextIntersection = (text1, text2) => {
  if (text1 === text2) {
    return 0
  } 
  const regType1 = getRegexType(text1);
  const regType2 = getRegexType(text2);
  if (regType1 === regType2 && regType1 !== RegexType.OTHER ) {
    return 0
  } else {
    return 100 - fuzz.ratio(text1, text2)
  }
}

const getRegexType = (text) => {
  if (isEmailRegexPattern(text)) {
    return RegexType.EMAIL
  } else if (isDateRegexPattern(text)) {
    return RegexType.DATE
  }
  return RegexType.OTHER
}

const isEmailRegexPattern = (text) => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(text).toLowerCase());
}

const isDateRegexPattern = (text) => {
  try {
    moment.locale('fr')
    let startDate = moment('01/01/1980', 'DD/MM/YYYY');
    let endDate = moment('01/01/2030', 'DD/MM/YYYY');
    let date = moment(text, ['DD/MM/YYYY', 'DD-MM-YYYY', 'dddd, MMMM Do YYYY', 'dddd [the] Do [of] MMMM', 'YYYY-MM-DD', 'MMM DD, YYYY']);
    if (date._isValid && date.isBefore(endDate) && date.isAfter(startDate)) {
      return true;
    }
    return false;
  }
  catch(err) {
    console.log(err);
    return false;
  }
}

const getGeoIntersection = (bbox1, bbox2) => {
  result = undefined;
  let coor1 = [getBboxCoordinates(bbox1)];
  let coor2 = [getBboxCoordinates(bbox2)];
  try {
    const poly1 = turf.polygon(coor1);
    const poly2 = turf.polygon(coor2);
    const intersection = turf.intersect(poly1, poly2);
    if (intersection) {
      const intersectionArea = turf.area(intersection);
      result = Math.min(intersectionArea/getBBoxArea(bbox1), intersectionArea/getBBoxArea(bbox2));
    }
  } catch (e) {
    console.log('coor1', coor1)
    console.log('coor2', coor2)
  }
  return Object.is(result, undefined) ? 0 : result;
}

const getSkeletonTopSignature = (skeleton) => {
  const lastItemIndex = Math.min(skeleton.length, 5)
  return skeleton.slice(0,lastItemIndex+ 1)
}

const getSkeletonBottomSignature = (skeleton) => {
  const startIndex = Math.max(0, skeleton.length - 5)
  return skeleton.slice(startIndex)
}

const getGeoClosestBoxScores = (ossature, bbox) => {
  let result = { // initializing default values to avoid null exceptions by caller function
    geoSimilitude: 0,
    textSimilitude: 0,
    bbox: {Text:''}
  }
  let index = 0;
  while(result.geoSimilitude < 0.5 && index < ossature.length) {
    let currentGrade = {
      geoSimilitude: getGeoIntersection(bbox, ossature[index]),
      textSimilitude: getTextIntersection(bbox.Text, ossature[index].Text),
      bbox: ossature[index]
    }
    if (currentGrade.geoSimilitude > result.geoSimilitude) {
      Object.assign(result, currentGrade);
    }
    index++;
  }
  return result;
}

/**
 * check skeleton has client/template (clientId, templateId)
 * add new client/template map (clientId, templateId, templateKeys)
 */
const constructMapppings = (templateKeys) => {
  let templateKeyBBoxMappingArr = []
  for (let i=0; i < templateKeys.length; i++) {
    templateKeyBBoxMappingArr.push([templateKeys[i].value , null]);
  }
  let templateKeyBBoxMapping = new Map(templateKeyBBoxMappingArr);
  return Object.fromEntries(templateKeyBBoxMapping);
}

const skeletonHasClientTemplate = (skeleton, clientId, templateId) => {
  const clientIdStr = typeof clientId === 'string' ? clientId : clientId.toString();
  const templateIdStr = typeof templateId === 'string' ? templateId : templateId.toString();
  skeleton = prepareSkeletonMappingsForApi(skeleton);
  if (skeleton.clientTemplateMapping.has(clientIdStr)) {
    let templateIds = skeleton.clientTemplateMapping.get(clientIdStr);
    return templateIds.includes(templateIdStr);
  }
  return false;
}

const skeletonStoreClientTemplate = (skeleton, clientId, templateId, templateKeys) => {
  skeleton = prepareSkeletonMappingsForApi(skeleton);
  if (skeleton.clientTemplateMapping.has(clientId)) {
    let templateIds = skeleton.clientTemplateMapping.get(clientId);
    if (!templateIds.includes(templateId)) {
      templateIds.push(templateId);
      skeleton.clientTemplateMapping.set(clientId, templateIds);
    }
  } else {
    skeleton.clientTemplateMapping.set(clientId, [templateId])
  }
  let bboxMapps = constructMapppings(templateKeys);
  let ggMaps = Object.assign({},  bboxMapps); // Necessary step: we have to create duplicate objects for each set of mappings. Otherwise all mappings would refer to same object in memory
  let imputMaps = Object.assign({},  bboxMapps);// Ditto
  skeleton.bboxMappings.set(mergeClientTemplateIds(clientId, templateId), bboxMapps);
  skeleton.ggMappings.set(mergeClientTemplateIds(clientId, templateId), ggMaps);
  skeleton.imputations.set(mergeClientTemplateIds(clientId, templateId), imputMaps);
  return skeleton
}

const skeletonUpdateBbox = (skeleton, clientId, templateId, keyName, bbox) => {
  skeleton = prepareSkeletonMappingsForApi(skeleton);
  const clientTemKey = mergeClientTemplateIds(clientId, templateId);
  if (skeleton.bboxMappings.has(clientTemKey)) {
    let newBboxmappings = skeleton.bboxMappings.get(clientTemKey);
    if (keyName in newBboxmappings) {
      // newBboxmappings[keyName] = bbox;
      let newBBoxEntry = new Map([[keyName, bbox]])
      newBboxmappings = Object.assign(newBboxmappings, mapToObject(newBBoxEntry))
      skeleton.bboxMappings.set(clientTemKey, newBboxmappings);
    }
  }
  return skeleton;
}

const skeletonUpdateGgMapping = (skeleton, clientId, templateId, keyName, ggKey) => {
  skeleton = prepareSkeletonMappingsForApi(skeleton);
  const clientTemKey = mergeClientTemplateIds(clientId, templateId);
  if (skeleton.ggMappings.has(clientTemKey)) {
    let newGgMappings = skeleton.ggMappings.get(clientTemKey);
    if (keyName in newGgMappings) {
      // newGgMappings[keyName] = ggKey;
      let newGgEntry = new Map([[keyName, ggKey]])
      newGgMappings = Object.assign(newGgMappings, mapToObject(newGgEntry))
      skeleton.ggMappings.set(clientTemKey, newGgMappings);
    }
  }
  return skeleton;
}

const skeletonUpdateImputationMapping = (skeleton, clientId, templateId, keyName, imput) => {
  skeleton = prepareSkeletonMappingsForApi(skeleton);
  const clientTemKey = mergeClientTemplateIds(clientId, templateId);
  if (skeleton.imputations.has(clientTemKey)) {
    let newImputMappings = skeleton.imputations.get(clientTemKey);
    if (keyName in newImputMappings) {
      newImputMappings[keyName] = imput;
      skeleton.imputations.set(clientTemKey, newImputMappings);
    }
  }
  return skeleton;
}

const prepareSkeletonMappingsForApi = (skeleton) => {
  skeleton.clientTemplateMapping =  objectToMap(skeleton.clientTemplateMapping);
  skeleton.bboxMappings = objectToMap(skeleton.bboxMappings);
  skeleton.ggMappings = objectToMap(skeleton.ggMappings);
  skeleton.imputations = objectToMap(skeleton.imputations);
  return skeleton
}

const prepareSkeletonMappingsForDB = (skeleton) => {
  skeleton.clientTemplateMapping =  mapToObject(skeleton.clientTemplateMapping);
  skeleton.bboxMappings = mapToObject(skeleton.bboxMappings);
  skeleton.ggMappings = mapToObject(skeleton.ggMappings);
  skeleton.imputations = mapToObject(skeleton.imputations);
  return skeleton
}

const gcpCoordParse = (bbox) => {
  let result = {
    Text : '',
    Coords: getGgBboxCoordinates(bbox)
  }
  return result;
}

const gradeTextSimilitude = (textsSke1, textsSke2) => {
  let textSimMatrix = buildTextSimilitudeMatrix(textsSke1, textsSke2);
  let munkresDistance = munkres(textSimMatrix);
  let grade = computeSignaturesTextSimilitude(textSimMatrix, munkresDistance);
  return grade;
}

const buildTextSimilitudeMatrix = (textsSke1, textsSke2) => {
  let matrix = [];
  for (let i = 0; i < textsSke1.length; i++) {
    let newTextSke1 = textsSke1[i];
    let row = textsSke2.map((newTextSke2) => getTextIntersection(newTextSke1, newTextSke2) ); // 100 - fuzz.ratio(newTextSke1.value, newTextSke2.value)
    matrix.push(row);
  }
  return matrix;
}

const computeSignaturesTextSimilitude = (templatesDistanceMatrix, munkresCombination) => {
  let result = 0;
  let totalItems = munkresCombination.length
  munkresCombination.forEach((pair) => {
    result += (100 - templatesDistanceMatrix[pair[0]][pair[1]]);
  })
  return parseFloat(result / totalItems);
}
module.exports = {
    skeletonsMatch,
    getGeoClosestBoxScores,
    skeletonHasClientTemplate,
    skeletonStoreClientTemplate,
    skeletonUpdateBbox,
    skeletonUpdateGgMapping,
    skeletonUpdateImputationMapping,
    prepareSkeletonMappingsForApi,
    prepareSkeletonMappingsForDB,
    gcpCoordParse,
};