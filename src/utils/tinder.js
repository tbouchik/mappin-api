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
    let matriks = buildKeysDistanceMatrix(primaryKeys, candidateKeys);
    let indicesMatches = munkres(matriks)
    let interestingMatches = indicesMatches.filter((pair) => matriks[pair[0]][pair[1]] <= treshold)
    interestingMatches.forEach((match) => {
        result.set(primaryKeys[match[0]], candidateKeys[match[1]])
    })
    return mapToObject(result);
}

const ggMetadataHasSimilarKey = (ggMetadata, ggKey) => {
  let isIn = false;
  if (ggMetadata && !isEmpty(ggMetadata) && ggKey) {
    if (ggKey in ggMetadata) {
      return ggKey
    } else {
      let idx = 0;
      let ggMetadataKeys = Object.keys(ggMetadata)
      while(idx < ggMetadataKeys.length && isIn === false) {
        let ggMetadataItem = ggMetadataKeys[idx]
        let currentTextSimilitude = fuzz.ratio(ggKey, ggMetadataItem);
        if (currentTextSimilitude && currentTextSimilitude > 90) {
          return ggMetadataItem
        }
        idx++;
      }
    }
  }
  return null;
}
  
  module.exports = {
    munkresMatch,
    ggMetadataHasSimilarKey,
  };
  