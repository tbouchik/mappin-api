const fuzz = require('fuzzball');
const munkres = require('munkres-js');
const { mapToObject } = require('./service.util')
const { isEmpty } = require('lodash');

const buildKeysDistanceMatrix = (newTemplateKeys, refTemplateKeys) => {
    let matrix = [];
    for (let i = 0; i < newTemplateKeys.length; i++) {
      let newTemplateKey = newTemplateKeys[i];
      let row = refTemplateKeys.map((refTemplateKey) => 100 - fuzz.ratio(newTemplateKey, refTemplateKey));
      matrix.push(row);
    }
    return matrix;
  }

const munkresMatch = (primaryKeys, candidateKeys, treshold) => {
    let result = new Map();
    let matriks = [];
    for (let i = 0; i < primaryKeys.length; i++) {
      let newTemplateKey = primaryKeys[i];
      let row = []
      for (let j = 0; j < candidateKeys.length; j++) {
        let refTemplateKey = candidateKeys[j];
        let distance = 100 - fuzz.ratio(newTemplateKey, refTemplateKey)
        if (distance < 10) {
          result.set(newTemplateKey, {
            match: refTemplateKey,
            score: 100 - distance
          });
          return mapToObject(result);
        } 
        row.push(distance);
      }
      matriks.push(row);
    }
    let indicesMatches = munkres(matriks);
    let interestingMatches = indicesMatches.filter((pair) => matriks[pair[0]][pair[1]] <= treshold);
    interestingMatches.forEach((match) => {
        result.set(primaryKeys[match[0]], {match: candidateKeys[match[1]], score:100 - matriks[match[0]][match[1]]})
    })
    return mapToObject(result);
}

const ggMetadataHasSimilarKey = (ggMetadata, ggKey) => {
  const TRESHOLD = 70
  if (ggMetadata && !isEmpty(ggMetadata) && ggKey) {
    if (ggKey in ggMetadata) {
      return ggKey
    } else {
      let ggMetadataKeys = Object.keys(ggMetadata)
      let similitudeArray = ggMetadataKeys.map(x => {return {key:x, score:fuzz.ratio(ggKey, x)}})
        .sort((a,b) => a.score > b.score? -1 : (b.score > a.score ? 1 : 0))
      return similitudeArray.length > 0 && similitudeArray[0].score > TRESHOLD ? similitudeArray[0].key : null
    }
  }
  return null;
}

const ggMetadataHasSimilarTag = (ggMetadata, tags) => {
  let result = null;
  let matches = munkresMatch(Object.keys(ggMetadata), tags, 35)
  let matchedTags = Object.keys(matches)
  if (matchedTags.length > 0) {
    result = matchedTags.reduce((a, b) => matches[a].score > matches[b].score ? a : b);
  }
  return result;
}

const compareStringsSimilitude = (text1, text2) => {
    return fuzz.ratio(text1, text2) 
}
  
module.exports = {
  munkresMatch,
  ggMetadataHasSimilarKey,
  ggMetadataHasSimilarTag,
  compareStringsSimilitude
};
  