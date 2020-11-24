const httpStatus = require('http-status');
const { pick } = require('lodash');
const AppError = require('../utils/AppError');
const { Document } = require('../models');
const { getQueryOptions } = require('../utils/service.util');
const { getFilterById, getDefaultFilterId } = require('./filter.service');
const { getClientByEmail } = require('./client.service');

const createDocument = async (user, documentBody) => {
  if (!user.isClient) {
    // Upload done by accountant
    documentBody.user = user._id;
    if (!documentBody.client) {
      const genericClient = await getClientByEmail(process.env.GENERIC_EMAIL);
      documentBody.client = genericClient._id;
    }
  } else {
    // Upload done by client so "user" field must be populated with accountant id
    documentBody.client = user._id;
    documentBody.user = client.user;
  }
  // Assign smart filter if no filter is specified
  const smartFilterId = await getDefaultFilterId(user);
  if (!documentBody.filter || documentBody.filter === smartFilterId) {
    let smartFilter = await getFilterById(user, smartFilterId);
    if (smartFilter) {
      smartFilter = smartFilter[0];
      documentBody.filter = smartFilter._id;
      documentBody.osmium = shapeOsmiumForSmartFilter(smartFilter);
    }
  } else {
    // Shape Osmium according to filter
    documentBody.osmium = await shapeOsmiumFromFilterId(user, documentBody.filter);
  }
  // Populate uploader
  documentBody.uploadedBy = user._id;
  const document = await Document.create(documentBody);
  return document;
};

const getDocuments = async (user, query) => {
  // FILTER
  let filter = {};
  if (!user.isClient) {
    // requestor is an accountant
    filter = pick(query, ['client', 'status', 'filter']); // filter by client if specified in query by accountant
    filter.user = user._id; // filter by accountant
  } else {
    // requestor is a client
    filter.client = user._id; // clients should only view their own files
  }
  if (query.name) {
    filter.name = { $regex: `(?i)${query.name}` } 
  }
  // OPTIONS
  let page = query.page || 0;
  let limit = query.limit || 300;
  let skip = page * limit;
  let sort = page.sort || { createdAt: -1 };
  const options = {
    limit,
    skip,
    sort,
  };
  console.log('options', options);
  console.log('query', query);
  console.log('filter', filter);
  let documents = await Document.find(filter, null, options)
    .populate('user', 'name')
    .populate('client', 'name')
    .populate('filter', 'name');
  return documents;
};

const getNextSmeltedDocuments = async (user, query) => {
  // FILTER
  let filter = {};
  if (!user.isClient) {
    // requestor is an accountant
    filter = pick(query, ['client', 'filter', 'status']); // filter by client if specified in query by accountant
    filter.user = user._id; // filter by accountant
  } else {
    // requestor is a client
    filter.client = user._id; // clients should only view their own files
  }
  if (query.name) {
    filter.name = { $regex: `(?i)${query.name}` } 
  }
  filter.status = filter.status ? filter.status : 'smelted'
  if (filter.status !== 'smelted'){
    return []
  }
  // OPTIONS
  let limit = 10
  let skip = query.skip || 0;
  let sort = { createdAt: -1 };
  const options = {
    limit,
    skip,
    sort,
  };
  // console.log('options', options);
  // console.log('query', query);
  // console.log('filter', filter);
  let documents = await Document.find(filter, '_id', options)
  return documents;
};

const getNextDocuments = async (user, query) => {
  // FILTER
  let filter = {};
  if (!user.isClient) {
    // requestor is an accountant
    filter = pick(query, ['client', 'filter', 'status']); // filter by client if specified in query by accountant
    filter.user = user._id; // filter by accountant
  } else {
    // requestor is a client
    filter.client = user._id; // clients should only view their own files
  }
  if (query.name) {
    filter.name = { $regex: `(?i)${query.name}` } 
  }
  
  // OPTIONS
  let sort = { createdAt: -1 };
  const options = {
    sort,
  };
  let documents = await Document.find(filter, '_id', options)
  console.log('docs, ', documents[0], query.current)
  let slicedDocs = []
  if (query.side === 'left' ){
    const currentIndex = documents.findIndex(x => x.id === query.current)
    slicedDocs = documents.slice(Math.max(0, currentIndex - 10) , currentIndex)
  }else {
    const currentIndex = documents.findIndex(x => x.id === query.current)
    slicedDocs = documents.slice(currentIndex+ 1, currentIndex + 10)
  }
  return slicedDocs;
};

const getDocumentsCount = async (user, query) => {
  let filter = {};
  if (!user.isClient) {
    // requestor is an accountant
    filter = pick(query, ['client', 'status', 'filter']); // filter by client if specified in query by accountant
    filter.user = user._id; // filter by accountant
  } else {
    // requestor is a client
    filter.client = user._id; // clients should only view their own files
  }
  if (query.name) {
    filter.name = { $regex: `(?i)${query.name}` } 
  }
  console.log('filter count :', filter);
  let count = await Document.countDocuments(filter);
  console.log('count is at ; ', count);
  return { count };
};

const getDocumentById = async (user, documentId) => {
  const document = await Document.findById(documentId)
    .populate('user', 'name')
    .populate('client', 'name')
    .populate('filter', 'name');
  if (!document) {
    throw new AppError(httpStatus.NOT_FOUND, 'Document not found');
  } else if (!user.isClient && parseInt(document.user._id) !== parseInt(user._id)) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to read this document');
  } else if (user.isClient && parseInt(document.client._id) !== parseInt(user._id)) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to read this document');
  }
  return document;
};

const updateDocument = async (user, documentId, updateBody) => {
  const document = await getDocumentById(user, documentId);
  if (!document) {
    throw new AppError(httpStatus.NOT_FOUND, 'Document not found');
  } else {
    console.log(document.user);
    console.log(user._id);
    if (!user.isClient && parseInt(document.user._id) !== parseInt(user._id)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to modify this document');
    } else if (user.isClient) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to modify this document');
    }
    if (updateBody.filter && document.filter !== updateBody.filter) {
      // User chose to change filter
      updateBody.osmium = shapeOsmiumFromFilterId(user, updateBody.filter); // Osmium must follow
    }
    if (updateBody.validated && updateBody.validated == 'validated') {
      updateBody.validatedBy = user._id;
    }
    Object.assign(document, updateBody);
    await document.save();
    return document;
  }
};

const deleteDocument = async (user, documentId) => {
  const document = await getDocumentById(user, documentId);
  if (!document) {
    throw new AppError(httpStatus.NOT_FOUND, 'Document not found');
  } else {
    if (!user.isClient && parseInt(document.user._id) !== parseInt(user._id)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to delete this document');
    } else if (user.isClient) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to delete this document');
    }
    await document.remove();
    return document;
  }
};

const shapeOsmiumFromFilterId = async (user, filterId) => {
  let osmium = [];
  // load filter from DB
  const filterArr = await getFilterById(user, filterId);
  // Shape Osmium according to filter
  osmium = filterArr.keys.map(filterKey => {
    return { Key: filterKey.value, Value: null };
  });
  return osmium;
};

const shapeOsmiumForSmartFilter = smartFilter => {
  let osmium = [];
  // Shape Osmium according to filter
  osmium = smartFilter.keys.map(filterKey => {
    return { Key: filterKey.value, Value: null };
  });
  return osmium;
};

module.exports = {
  createDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  getDocumentsCount,
  getNextSmeltedDocuments,
  getNextDocuments,
};
