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
  
  module.exports = {
    munkresMatch,
  };
  