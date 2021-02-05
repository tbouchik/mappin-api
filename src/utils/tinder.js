const fuzz = require('fuzzball');
const munkres = require('munkres-js');
const { mapToObject } = require('./service.util')

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
  if (ggMetadata && ggMetadata.length && ggKey) {
    if (ggKey in ggMetadata) {
      isIn = true;
    } else {
      let idx = 0;
      while(idx < ggMetadata.length && isIn === false) {
        let currentTextSimilitude = fuzz.ratio(ggKey, ggMetadata[idx]);
        if (currentTextSimilitude && currentTextSimilitude > 90) {
          isIn = true;
        }
        idx++;
      }
    }
  }
  return isIn;
}
  
  module.exports = {
    munkresMatch,
    ggMetadataHasSimilarKey,
  };
  