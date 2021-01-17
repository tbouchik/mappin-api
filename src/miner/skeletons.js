const fuzz = require('fuzzball');
const moment = require('moment');
const turf = require("@turf/turf")
const { RegexType, SignatureMatchRating } = require('../utils/service.util');
const { mergeClientTemplateIds } = require('../utils/service.util')

const skeletonsMatch = (skeleton1, skeleton2) => {
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
  let areaIntersections = [];
  let textIntersections = [];
  for (let i = 0; i< Math.min(ske1.length, ske2.length); i++ ) {
    areaIntersections.push(getGeoIntersection(ske1[i], ske2[i]))
    textIntersections.push(getTextIntersection(ske1[i].Text, ske2[i].Text))
  }
  const areaSum = areaIntersections.reduce((a, b) => a + b, 0);
  const areaAverage = (areaSum / areaIntersections.length) || 0;
  if (areaAverage > 0.85 && textIntersections > 75) {
    return SignatureMatchRating.EXCELLENT
  }
  else if ((areaAverage > 0.85 && textIntersections < 75) || (areaAverage < 0.85 && textIntersections > 75)) {
    return SignatureMatchRating.SHAKY
  }
  return SignatureMatchRating.BAD
}

const getBboxCoordinates = (bbox) => {
  const topLeft = [bbox.Left, bbox.Top];
  const topRight = [bbox.Left + bbox.Width , bbox.Top];
  const bottomLeft = [bbox.Left, bbox.Top + bbox.Height];
  const bottomRight = [bbox.Left + bbox.Width, bbox.Top + bbox.Height];
  return [topLeft, topRight, bottomLeft, bottomRight];
}

const getBBoxArea = (bbox) => {
  return bbox.Height*bbox.Width;
}

const getTextIntersection = (text1, text2) => {
  if (text1 === text2) {
    return 100
  } 
  const regType1 = getRegexType(text1);
  const regType2 = getRegexType(text2);
  if (regType1 === regType2 && regType1 !== RegexType.OTHER ) {
    return 100
  } else {
    return fuzz.ratio(text1, text2)
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
    let startDate = moment('01/01/1980', 'DD/MM/YYYY');
    let endDate = moment('01/01/2030', 'DD/MM/YYYY');
    let date = moment(text, 'DD/MM/YYYY');
    if (date._isValid && date.isBefore(endDate) && date.isAfter(startDate)) {
      return true;
    }
    return false;
  }
  catch(err) {
    console.log(error);
    return false;
  }
}

const getGeoIntersection = (bbox1, bbox2) => {
  result = undefined;
  const poly1 = turf.polygon(getBboxCoordinates(bbox1));
  const poly2 = turf.polygon(getBboxCoordinates(bbox2));
  const intersection = turf.intersect(poly1, poly2);
  if (intersection) {
    const intersectionArea = turf.area(intersection);
    result = Math.min(intersectionArea/getBBoxArea(bbox1), intersectionArea/getBBoxArea(bbox2));
  }
  return Object.is(result, undefined) ? 0 : result;
}

const getSkeletonTopSignature = (skeleton) => {
  const lastItemIndex = Math.max(skeleton.length, 5)
  return skeleton.slice(0,lastItemIndex+ 1)
}

const getSkeletonBottomSignature = (skeleton) => {
  const startIndex = Math.min(0, skeleton.length - 3)
  return skeleton.slice(startIndex)
}

const getGeoClosestBoxScores = (skeleton, bbox) => {
  let result = { // initializing default values to avoid null exceptions by caller function
    geoSimilitude: 0,
    textSimilitude: 0,
    bbox: {Text:''}
  }
  let checkedBboxes = [];
  let index = 0;
  while(result.geoSimilitude < 0.5 && index < skeleton.length) {
    let currentGrade = {
      geoSimilitude: getGeoIntersection(bbox, skeleton[index]),
      textSimilitude: getTextIntersection(bbox.Text, skeleton[index].Text),
      bbox: skeleton[index]
    }
    checkedBboxes.push(currentGrade);
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
const constructBboxMapppings = (templateKeys) => {
  let templateKeyBBoxMappingArr = []
  for (let i=0; i < templateKeys.length; i++) {
    templateKeyBBoxMappingArr.push([templateKeys[i].value , null])
  }
  let templateKeyBBoxMapping = new Map(templateKeyBBoxMappingArr)
  return Object.fromEntries(templateKeyBBoxMapping)
}

const skeletonHasClientTemplate = (skeleton, clientId, templateId) => {
  if (skeleton.clientTemplateMapping.has(clientId)) {
    let templateIds = skeleton.clientTemplateMapping.get(clientId);
    return templateIds.includes(templateId);
  }
  return false;
}

const skeletonStoreClientTemplate = (skeleton, clientId, templateId, templateKeys) => {
  if (skeleton.clientTemplateMapping.has(clientId)) {
    let templateIds = skeleton.clientTemplateMapping.get(clientId);
    if (!templateIds.includes(templateId)) {
      templateIds = templateIds.push(templateId);
      skeleton.clientTemplateMapping.set(clientId, templateIds)
    }
  } else {
    skeleton.clientTemplateMapping.set(clientId, [templateId])
  }
  let bboxMapps = constructBboxMapppings(templateKeys);
  skeleton.bboxMappings.set(mergeClientTemplateIds(clientId, templateId), bboxMapps);
  return skeleton
}


module.exports = {
    skeletonsMatch,
    getGeoClosestBoxScores,
    skeletonHasClientTemplate,
    skeletonStoreClientTemplate,
};


/** **** ShapeOsmium ****
 *    Extract Metadata
 *    Search for similar (skeleton)                                                         #Algo 1        
 *    if ( skeleton.clientTemplateMapping(clientId).templateId exists)
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
