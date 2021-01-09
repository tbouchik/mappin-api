const fuzz = require('fuzzball');
const moment = require('moment');
const turf = require("@turf/turf")
const { RegexType, SignatureMatchRating } = require('../utils/service.util');

const populateOsmium = (document, template) => {
    let newDocument = Object.assign({}, document);
    // Detect boxes that correspond to template keys
    const metadata = newDocument.metadata.page_1;
    const indexesMapper = pullReadableBoxesIndexes(template, metadata)
    // Mapp each "KEY" box with a "VALUE" box
    indexesMapper.map((idxMapper) =>  {
      newDocument.osmium[idxMapper.template].Value = pullMirrorBoxText(metadata, idxMapper.metadata);
    });
    // Populate Date
    metadata.map((box) => {
      try {
        let startDate = moment('01/01/1990', 'DD/MM/YYYY');
        let endDate = moment('01/01/2030', 'DD/MM/YYYY');
        let date = moment(box.Text, 'DD/MM/YYYY');
        if (!date.includes('NaN') &&
            !date.includes('Invalid') &&
            date.isBefore(endDate) &&
            date.isAfter(startDate)
        ){
          newDocument.osmium[1].Value = date.format('DD/MM/YYYY')
        }
      }
      catch(err) {
        
      }
    })
    return newDocument;
};

const pullReadableBoxesIndexes = (template, metadata) => {
  let indexes = [];
  const options = {
    scorer: fuzz.ratio, // Any function that takes two values and returns a score, default: ratio
    processor: choice => choice.Text,  // Takes choice object, returns string, default: no processor. Must supply if choices are not already strings.
    limit: 1, // Max number of top results to return, default: no limit / 0.
    cutoff: 50, // Lowest score to return, default: 0
  };
  template.keys.map((templateItem, idx) => {
    let mapper = {template: idx};
    const query = templateItem.value;
    const results = fuzz.extract(query, metadata, options);
    if (results.length) {
      mapper.metadata = results[0][2];
      indexes.push(mapper);
    }
  })
  return indexes;
}
const pullMirrorBoxText = (metadata, index) => {
  let alignedOnRightBoxes = metadata.filter((box) => {
  
    return (
      box.Left > metadata[index].Left &&
      Math.abs(box.Top - metadata[index].Top) < 0.009 &&
      Math.abs(box.Height - metadata[index].Height) < 0.09 
    )
  })
  if (!alignedOnRightBoxes.length){
    return ''
  }
  else if (alignedOnRightBoxes.length && alignedOnRightBoxes.length > 1) {
    if (index+1 < metadata.length){
      return metadata[index + 1].Text
    }else{
      return ''
    }
  } else {
    return alignedOnRightBoxes[0].Text
  }
}

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
  return result
}

const getSkeletonTopSignature = (skeleton) => {
  const lastItemIndex = Math.max(skeleton.length, 5)
  return skeleton.slice(0,lastItemIndex+ 1)
}

const getSkeletonBottomSignature = (skeleton) => {
  const startIndex = Math.min(0, skeleton.length - 3)
  return skeleton.slice(startIndex)
}

module.exports = {
  populateOsmium
};

// defaultFilter.keys = [
//   {value:'Invoice Number', type:'NUMBER'},
//   {value:'Issue Date', type:'DATE'},
//   {value:'Order Id / Tracking No', type:'TEXT'},
//   {value:'Seller Name', type:'TEXT'},
//   {value:'Seller Address', type:'TEXT'},
//   {value:'Seller GST VAT Number', type:'NUMBER'},
//   {value:'Buyer Name', type:'TEXT'},
//   {value:'Buyer Address', type:'TEXT'},
//   {value:'Buyer GST VAT Number', type:'NUMBER'},
//   {value:'Subtotal', type:'NUMBER'},
//   {value:'Tax Rate', type:'NUMBER'},
//   {value:'Tax Total', type:'NUMBER'},
//   {value:'Total Due', type:'NUMBER'},
// ];

/** 
 * query = "126abzx";
choices = [{id: 345, model: "123abc"},
           {id: 346, model: "123efg"},
           {id: 347, model: "456abdzx"}];

options = {
        scorer: fuzz.partial_ratio, // Any function that takes two values and returns a score, default: ratio
        processor: choice => choice.model,  // Takes choice object, returns string, default: no processor. Must supply if choices are not already strings.
        limit: 2, // Max number of top results to return, default: no limit / 0.
        cutoff: 50, // Lowest score to return, default: 0
        unsorted: false // Results won't be sorted if true, default: false. If true limit will be ignored.
};

results = fuzz.extract(query, choices, options);

// [choice, score, index/key]
[ [ { id: 347, model: '456abdzx' }, 71, 2 ],
  [ { id: 345, model: '123abc' }, 67, 0 ] ]
 */

/** **** ShapeOsmium ****
 *    Extract Metadata
 *    Search for similar (skeleton)                                                         #Algo 1        
 *    if (similar skeleton<clientId;TemplateId> exists)
 *      then { populate }                                                                   #Algo 2
 *    else if (similar skeleton exists)
 *      then {
 *            do a bestGuessMapping between the 2 templateKeys                              #Algo 3
 *            do populate                                                                   #Algo 2
 *           }
 *    else
 *      then {
 *              do bestGuessMapping between templateKeys and keysBoundingBoxes              #Algo 4
 *              do bestGuessMapping between keysBoundingBoxes and valuesBoundingBoxes       #Algo 5
 *              do populate                                                                 #Algo 2
 *          } 
 */

 /** **** updateOsmium ****
 * If value is changed
 *    Change Skeleton.HashMap<Client-Template-Tuple; Bbox-TemplateKey-Pair>
 */

/**
 * Skeleton:
 *    Shape TODO:
 *    List<Client; Template>
 *    HashMap<ClientTemplateTuple; TemplateKeysBBoxesMappings>
 */