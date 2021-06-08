const moment = require('moment');
const { pick } = require('lodash');

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

function parseAlphaChar (str) {
  if (typeof str === 'string') {
    return str.replace(',', '.').replace(/[^\d.-]/g, '')
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
  if (!value) return ''
  let result = ''
  try {
    moment.locale('fr')
    let date = moment(value, ['D MMMM YYYY', 'DD MMMM YYYY', 'D MMM YYYY', 'DD MMM YYYY','D MMMM YY', 'DD MMMM YY', 'D MMM YY', 'DD MMM YY', 'DD/MM/YYYY', 'DD-MM-YYYY', 'dddd, MMMM Do YYYY', 'dddd [the] Do [of] MMMM', 'YYYY-MM-DD', 'MMM DD, YYYY'])
    if(parseToDate) {
      result = date.toDate();
    } else {
      result = date.format('DD/MM/YYYY');
    }
  } catch (error) {
    console.log('Moment Library Error', error)
  }
  return result
}

function formatValue (value, keyType, keyRole, parseToDate) {
  let parsedValue = null
  switch (keyType) {
    case 'NUMBER':
      parsedValue = parseAlphaChar(value)
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
};
