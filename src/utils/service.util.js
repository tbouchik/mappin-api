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

function parseDate (value) {
  if (!value) return ''
  let parsedInput = ''
  try {
    moment.locale('fr')
    parsedInput = moment(value, ['D MMMM YYYY', 'DD MMMM YYYY', 'D MMM YYYY', 'DD MMM YYYY','D MMMM YY', 'DD MMMM YY', 'D MMM YY', 'DD MMM YY', 'DD/MM/YYYY', 'DD-MM-YYYY', 'dddd, MMMM Do YYYY', 'dddd [the] Do [of] MMMM', 'YYYY-MM-DD', 'MMM DD, YYYY']).format('DD/MM/YYYY')
  } catch (error) {
    console.log('Moment Library Error', error)
  }
  return parsedInput
}

function formatValue (value, keyType) {
  let parsedValue = null
  switch (keyType) {
    case 'NUMBER':
      parsedValue = parseAlphaChar(value)
      break
    case 'DATE':
      parsedValue = parseDate(value)
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
