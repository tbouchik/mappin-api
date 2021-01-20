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

const mergeClientTemplateIds = (client, template) => {
  return `${client}_${template}`;
}

const RegexType = Object.freeze({'EMAIL':1, 'DATE':2, 'OTHER':3})

const SignatureMatchRating = Object.freeze({'EXCELLENT':1, 'SHAKY':2, 'BAD':3})

const objectToMap = (objOrMap) => {
  return objOrMap instanceof Map ? objOrMap : new Map( Object.entries(objOrMap));
}

const mapToObject = (objOrMap) => {
  return objOrMap instanceof Map ? Object.fromEntries(objOrMap) : objOrMap;
}

module.exports = {
  getQueryOptions,
  RegexType,
  SignatureMatchRating,
  mergeClientTemplateIds,
  objectToMap,
  mapToObject,
};
