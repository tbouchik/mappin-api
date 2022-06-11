const httpStatus = require('http-status');
const { pick, omit, pickBy } = require('lodash');
const AppError = require('../utils/AppError');
const { Document } = require('../models');
const { getQueryOptions } = require('../utils/service.util');
const { getFilterById } = require('./filter.service');
const { getClientByEmail } = require('./client.service');
const status = require('./../enums/status');

const applyOrderRelationshipOnFilter = (query, field, orderOperator) => {
  result = null;
  switch (query[orderOperator]) {
    case 'gt':
      result = { $gte: query[field]}          
      break;
    case 'lt':
      result = { $lte: query[field]} 
      break;
    default:
      result = { $eq: query[field]} 
      break;
  }
  return result
}

const getQueryFilter = (query) => {
  let ObjectId = require('mongoose').Types.ObjectId; 
  let filter = pick(query, ['client', 'status', 'filter', 'skeleton', 'isArchived', 'isBankStatement', '_id']); // filter by client if specified in query by accountant
  filter.client = filter.client? ObjectId(filter.client): null
  if (query.name) {
    filter.name = { $regex: `(?i)${query.name}` };
  }
  if (query.vendor) {
    filter.vendor = { $regex: `(?i)${query.vendor}` };
  }
  if (query.vat) {
    filter.vat = { $regex: `(?i)${query.vat}` };
  }
  if (query.bankEntity) {
    filter.bankEntity = { $regex: `(?i)${query.bankEntity}` };
  }
  if (query.totalHt) {
    filter.totalHt = applyOrderRelationshipOnFilter(query, 'totalHt', 'totalHtOperator');
  }
  if (query.totalTtc) {
    filter.totalTtc = applyOrderRelationshipOnFilter(query, 'totalTtc', 'totalTtcOperator');
  }
  if (query.vat) {
    filter.vat = applyOrderRelationshipOnFilter(query, 'vat', 'vatOperator');
  }
  if (query.dates) {
    if (filter.isBankStatement){
      filter.dateBeg = { $gte : query.dates[0] };
      filter.dateEnd = { $lte : query.dates[1] };
    } else {
      filter.invoiceDate = { $gte : query.dates[0], $lte : query.dates[1] };
    }
  }
  return pickBy(filter, (v,_) => { return typeof v === 'number' || typeof v === 'boolean' || !!v });
};

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
  // Shape Osmium according to filter
  documentBody.osmium = await shapeOsmiumFromFilterId(user, documentBody.filter);
  // Populate uploader
  documentBody.uploadedBy = user._id;
  const document = await Document.create(documentBody);
  return document;
};

const getDocuments = async (user, query) => {
  // FILTER
  let filter = getQueryFilter(query)
  filter.user = user._id;
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
  let documents = await Document.find(filter, null, options)
    .populate('user', 'name')
    .populate('client', 'name')
    .populate('journal', 'name')
    .populate('filter');
  return documents;
};

const getNextSmeltedDocuments = async (user, query) => {
  // FILTER
  let filter = getQueryFilter(query)
  filter.user = user._id;
  filter.status =  status.SMELTED
  // OPTIONS
  let sort = { createdAt: -1 };
  const options = {
    sort,
  };
  let documents = await Document.find(filter, '_id', options)
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

const exportBulkCSV = async (user, query) => {
  // FILTER
  let filter = getQueryFilter(query)
  filter.user = user._id;
  let templateIds = await Document.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$filter',
      }
    }
  ]);
  let docIds = []
  let result = await Promise.all(templateIds.map( async  (templateIdObj) => {
    let aggregate = Object.assign({}, templateIdObj)
    filter.filter = templateIdObj._id
    let docs = await getDocuments(user, filter)
    docIds = docIds.concat(docs.map(x => x._id));
    let template = docs[0].filter;
    let nonImputableOsmiumKeysIndices = template.keys.map((x, i) => {if (x.isImputable !== true)return i})
                                          .filter(x => x !== undefined)
    let imputableOsmiumKeysIndices = template.keys.map((x, i) => {if (x.isImputable === true)return i})
                                          .filter(x => x !== undefined)
    let fixedKeys = ['N° Compte', 'Valeur'] // TODO change logic once real requirements come in
    if (template.isActiveDC) {
      fixedKeys.push('Sens')
    }
    if (template.isActiveJournal) {
      fixedKeys.push('Journal')
    }
    const osmiumKeys = nonImputableOsmiumKeysIndices.map((keyIdx) => template.keys[keyIdx].value).concat(fixedKeys)
    aggregate.template = template.name
    aggregate.header = osmiumKeys
    aggregate.osmiums = []
    docs.forEach(doc => {
      let documentSerialization = []
      let nonImputableEntrySegment = nonImputableOsmiumKeysIndices.map(nonImputableIdx => doc.osmium[nonImputableIdx].Value)
      // add osmiums
      imputableOsmiumKeysIndices.forEach((imputableOsmiumKey) => {
        let imputableEntrySegment = [ doc.osmium[imputableOsmiumKey].Imputation,
        doc.osmium[imputableOsmiumKey].Value ];
        // populate sens
        const roleArr = doc.osmium[imputableOsmiumKey].Role
        if (template.isActiveDC) {
          if (roleArr && roleArr.constructor === Array && roleArr.length > 0) {
            if(roleArr[roleArr.length - 1] === 'TOTAL_TTC') {
              imputableEntrySegment.push('C')
            } else {
              imputableEntrySegment.push('D')
            }
          } 
        }
        // populate journal
        // if (template.isActiveJournal) {
        //   imputableEntrySegment.push(doc.journal)
        // }
        let osmiumEntrySegment = nonImputableEntrySegment.concat(imputableEntrySegment);
        documentSerialization.push(osmiumEntrySegment)
      })
      // add expenses
      doc.references.forEach((ref) => {
        let expenseSegment = [ref.Imputation, ref.Price]
        // populate sens
        if (template.isActiveDC) {
          expenseSegment.push('D')
        }
        // populate journal
        // if (template.isActiveJournal) {
        //   expenseSegment.push(doc.journal)
        // }
        let referenceEntrySegment = nonImputableEntrySegment.concat(expenseSegment);
        documentSerialization.push(referenceEntrySegment)
      })
      aggregate.osmiums.push(documentSerialization)
    })
    return aggregate
  }));
  return {aggregate:result, ids:docIds}
};

const exportBankStatementsBulkCSV = async (user, query) => {
  // FILTER
  let filter = {};
  if (!user.isClient) {
    // requestor is an accountant
    filter = pick(query, ['client', 'status', 'isBankStatement']); // filter by client if specified in query by accountant
    filter.user = user._id; // filter by accountant
    let ObjectId = require('mongoose').Types.ObjectId; 
    filter.client = filter.client? ObjectId(filter.client): null
  } else {
    // requestor is a client
    filter.client = user._id; // clients should only view their own files
  }
  if (query.name) {
    filter.name = { $regex: `(?i)${query.name}` } 
  }
  let docIds = []
  let docs = await getDocuments(user, filter);
  docIds = docIds.concat(docs.map(x => x._id));
  let fixedKeys = ['Date Opération', 'Désignation', 'Compte', 'Débit', 'Crédit']; // TODO change logic once real requirements come in
  let csvData = [];
  let names = {}
  docs.forEach((document) =>  {
    let currentName = getTitleForBankStatementDocument(document);
    if (names.hasOwnProperty(currentName)){
      names[currentName] += 1
      let currentNameCount = names[currentName]
      currentName = currentName.concat('_').concat(currentNameCount)
    } else {
      names[currentName] = 0
    }
    let currentDocument = {
      header: fixedKeys,
      title: currentName
    };
    let docContent = [];
    Object.keys(document.bankOsmium).forEach((docPage) => {
      const pageStatements = document.bankOsmium[docPage];
      pageStatements.forEach((statement) => {
        let entrySegment = [statement.Date.Text, statement.Designation.Text, statement.Compte.Text, statement.Debit.Text, statement.Credit.Text];
        docContent.push(entrySegment);
      })
    })
    currentDocument.content = docContent;
    csvData.push(currentDocument);
  })
  return {aggregate:csvData, ids:docIds};
};

const getTitleForBankStatementDocument = (document) => {
  const bankNameObj = document.osmium.find((x) => x.Role[x.Role.length -1] === 'BANK_NAME');
  const bankName = bankNameObj ? '_'.concat(bankNameObj.Value) : undefined;
  const dateFromObj = document.osmium.find((x) => x.Role[x.Role.length -1] === 'DATE_FROM');
  const dateFrom = dateFromObj ? '_'.concat(dateFromObj.Value).replace(/\//g, '_') : undefined;
  const clientName = document.client.name.replace(/\s/g, '_').toUpperCase();
  return clientName.concat(bankName || '').concat(dateFrom || '');
}

const archive = async (docIds) => {
  await Document.updateMany({'_id': { $in: docIds }}, {isArchived: true, status: status.ARCHIVED})
};

const getNextDocuments = async (user, query) => {
  // FILTER
  let filter = getQueryFilter(query)
  filter.user = user._id;
  // OPTIONS
  let sort = { createdAt: -1 };
  const options = {
    sort,
  };
  let documents = await Document.find(filter, '_id', options)
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
  let filter = getQueryFilter(query)
  filter.user = user._id;
  let count = await Document.countDocuments(filter);
  return { count };
};

const getDocumentById = async (user, documentId) => {
  const document = await Document.findById(documentId)
    .populate('user', 'name')
    .populate('client', 'name')
    .populate('journal', 'name')
    .populate('filter');
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
    if (!user.isClient && parseInt(document.user._id) !== parseInt(user._id)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to modify this document');
    } else if (user.isClient) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to modify this document');
    }
    if (updateBody.filter && document.filter !== updateBody.filter) {
      // User chose to change filter
      updateBody.osmium = await shapeOsmiumFromFilterId(user, updateBody.filter); // Osmium must follow
      updateBody.status = status.SMELTED;
    }
    if (updateBody.validated && updateBody.validated == status.VALIDATED) {
      updateBody.validatedBy = user._id;
    }
    if (updateBody.newJournal ) {
      updateBody.journal = updateBody.newJournal;
    }
    updateBody = omit(updateBody, ['mbc', 'refMapping', 'newJournal']);
    Object.assign(document, updateBody);
    await document.save()
    return document;
  }
};

const updateManyDocuments = async (user, reqBody) => {
    const { idsArray, body } = reqBody;
    const response = await Document.updateMany({'_id': { $in: idsArray }}, {...body});
    if (response.nModified !== idsArray.length){
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR , 'Error during Documents bulk update'); 
    }
    return true;
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

const deleteManyDocuments = async (user, body) => {
  const { idsArray } = body;
  const response = await Document.deleteMany({'_id': { $in: idsArray }});
  if (response.deletedCount !== idsArray.length){
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR , 'Error during Documents bulk delete'); 
  }
  return true; 
};

const shapeOsmiumFromFilterId = async (user, filterId) => {
  let osmium = [];
  // load filter from DB
  const filterArr = await getFilterById(user, filterId);
  // Shape Osmium according to filter
  osmium = filterArr.keys.map(filterKey => {
    return { Key: filterKey.value, Value: null, Imputation: filterKey.isImputable ? '' : null, Role: filterKey.role || null };
  });
  return osmium;
};

module.exports = {
  createDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  updateManyDocuments,
  deleteDocument,
  deleteManyDocuments,
  getDocumentsCount,
  getNextSmeltedDocuments,
  getNextDocuments,
  exportBankStatementsBulkCSV,
  exportBulkCSV,
  archive,
};
