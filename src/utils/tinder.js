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
  if (ggMetadata && !isEmpty(ggMetadata) && tags.length >0) {
    tags.forEach((tag) => {
      if (tag in ggMetadata) {
        return tag
      } else {
        let ggMetadataKeys = Object.keys(ggMetadata)
        let similitudeArray = ggMetadataKeys.map(x => {return {key:x, score:fuzz.ratio(tag, x)}})
        .filter(x => x.score >= 65) // TODO make treshold parametrable
        .sort((a,b) => a.score > b.score? -1 : (b.score > a.score ? 1 : 0))
        result = similitudeArray.length > 0 ? similitudeArray[0].key : null
      }
    })
  }
  return result;
}
  
  module.exports = {
    munkresMatch,
    ggMetadataHasSimilarKey,
    ggMetadataHasSimilarTag
  };
  