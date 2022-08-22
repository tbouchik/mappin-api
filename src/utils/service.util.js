const moment = require('moment');

const getQueryOptions = query => {
  const page = query.page * 1 || 1;
  const limit = query.limit * 1 || 100;
  const skip = (page - 1) * limit;

  const sort = {};
  if (query.sortBy) {
    const parts = query.sortBy.split(':');
    sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
  }

  return { limit, skip, sort };
};

const getOptions = query => {
  let page = query.page || 0;
  let limit = query.limit || 300;
  let skip = page * limit;
  let sort = page.sort || { createdAt: -1 };
  const options = {
    limit,
    skip,
    sort,
  };
  return options
};


const mergeClientTemplateIds = (client, template) => {
  let clientId = client._id ? client._id.toString() :client;
  let templateId = template._id ? template._id.toString() : template;
  return `${clientId}_${templateId}`;
}

const RegexType = Object.freeze({'EMAIL':1, 'DATE':2, 'OTHER':3})

const SignatureMatchRating = Object.freeze({'EXCELLENT':1, 'SHAKY':2, 'BAD':3})

const objectToMap = (objOrMap) => {
  if (objOrMap=== null || objOrMap=== undefined) return objOrMap
  return objOrMap instanceof Map ? objOrMap : new Map( Object.entries(objOrMap));
}

const mapToObject = (objOrMap) => {
  if (objOrMap=== null || objOrMap=== undefined) return objOrMap
  return objOrMap instanceof Map ? Object.fromEntries(objOrMap) : objOrMap;
}

function parseNumericChar (str) {
  if (typeof str === 'string') {
    return str.replace(/[^0-9]+/gi, '')
  }
  return str
}

function insertDecimal (str, delta) {
  if (typeof str === 'string') {
    let numChars = parseNumericChar(str)
    let numCharsLen = numChars.length
    let result = numChars.slice(0, numCharsLen-delta) + ("." || "") + numChars.slice(numCharsLen-delta);
    return result;
  }
  return str
}

function parsePrice(val) {
  if (!val) return val
  let result = val
  let value = val.replace(/[^0-9,\.]/gi, '')
  let lastDotIdx = value.lastIndexOf('.')
  let lastCommaIdx = value.lastIndexOf(',')
  let len = value.length
  if (lastDotIdx === -1 && lastCommaIdx===-1) {
    result = parseNumericChar(value)
  } else if (lastDotIdx === -1 && lastCommaIdx!==-1) {
    let delta = len - 1 - lastCommaIdx
    if ( delta <= 2 ) result = insertDecimal(value, delta)
    else result = parseNumericChar(value)
  } else if (lastDotIdx !== -1 && lastCommaIdx===-1) {
    let delta = len - 1 - lastDotIdx
    if ( delta <= 2 ) result = insertDecimal(value, delta)
    else result = parseNumericChar(value)
  } else{
    let last = Math.max(lastDotIdx, lastCommaIdx)
    let delta = len - 1 - last
    if ( delta <= 2 ) result = insertDecimal(value, delta)
    else result = parseNumericChar(value)
  }
  return result
}

function removeBlanksFromString (str) {
  if (typeof str === 'string') {
    return str.replace(/(\r\n|\n|\r)/gm, " ");
  }
  return str
}

function parseDateRange (value, side) {
  let result = { value: '', hasRange: false }
  const pattern = /(du)(.*)(au)(.*)/gi
  const matches = [...value.matchAll(pattern)]
  if (matches && matches.length && matches[0].length >= 5) {
    const duIdx = matches[0].findIndex(x => x.trim() === 'du')
    const auIdx = matches[0].findIndex(x => x.trim() === 'au')
    if (side === 'dateBeg' && duIdx + 1 < matches[0].length) {
      result.value = matches[0][duIdx + 1]
      result.hasRange = true
      return result
    } else if (side === 'dateEnd' && auIdx + 1 < matches[0].length) {
      result.value = matches[0][auIdx + 1]
      result.hasRange = true
      return result
    }
  }
  return result
}

function parseDate (value, parseToDate) {
  let result = null
  try {
    moment.locale('fr')
    let date = moment(value, ['D MMMM YYYY', 'DD MMMM YYYY', 'D MMM YYYY', 'DD MMM YYYY','D MMMM YY', 'DD MMMM YY', 'D MMM YY', 'DD MMM YY', 'DD/MM/YYYY', 'DD-MM-YYYY', 'dddd, MMMM Do YYYY', 'dddd [the] Do [of] MMMM', 'YYYY-MM-DD', 'MMM DD, YYYY'])
    if(parseToDate) {
      result = date._isValid? date.toDate() : null;
    } else {
      result = date._isValid? date.format('DD/MM/YYYY') : null;
    }
  } catch (error) {
    console.log('Moment Library Error', error)
  }
  return result
}

function formatValue (value, keyType, keyRole, parseToDate) {
  let parsedValue = null
  if (keyRole && keyRole.length && (keyRole[keyRole.length - 1]) === 'INVOICE_REF'){
    parsedValue = value.includes(':') ? value.split(':')[1] : value;
    parsedValue = value.includes('°') ? value.split('°')[1] : value
  } else {
    switch (keyType) {
      case 'NUMBER':
        parsedValue = parsePrice(value)
        break
      case 'DATE':
        if (keyRole === 'dateBeg' || keyRole=== 'dateEnd') {
          let parseResult = parseDateRange(value, keyRole)
          parsedValue = parseResult.hasRange ?parseDate(parseResult.value, parseToDate)  : parseDate(value, parseToDate);;
        } else {
          parsedValue = parseDate(value, parseToDate);
        }
        break
      default:
        parsedValue = value
    }
  }
  return parsedValue
}
module.exports = {
  getQueryOptions,
  RegexType,
  SignatureMatchRating,
  mergeClientTemplateIds,
  objectToMap,
  mapToObject,
  formatValue,
  getOptions,
  removeBlanksFromString,
};
