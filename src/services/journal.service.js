const httpStatus = require('http-status');
const { pick } = require('lodash');
const AppError = require('../utils/AppError');
const { Journal, User } = require('../models');
const { getQueryOptions } = require('../utils/service.util');

const createJournal = async (user, journalBody) => {
  journalBody.user = user._id;
  journalBody.lastModifiedBy = user._id;
  const journal = await Journal.create(journalBody);
  return journal;
};

makeDefaultJournal = async (user, journalBody) => {
  let journal = {};
  await Journal.updateMany({}, {isDefault: false});
  if (journalBody && journalBody.id) {
    journal = await updateJournal(user,journalBody.id, {isDefault: true} )
  }
  return journal
};

const getJournals = async (user, query) => {
  const journal = {};
  const usersFromSameCompany = await User.find({company: user.company}).select({ "_id": 1}).exec()
  const usersIdsFromSameCompany = usersFromSameCompany.map(x => x._id)
  if (query.name) {
    journal.name = { $regex: `(?i)${query.name}` } 
  }
  if (query.type) {
    journal.type = query.type;
  }
  if (query.code) {
    journal.code = { $regex: `(?i)${query.code}` };
  }
  if(query.current) {
    let ObjectId = require('mongoose').Types.ObjectId;
    const idToExclude = new ObjectId(query.current)
    journal._id = { $ne: idToExclude }
  }
  journal.user = {$in: usersIdsFromSameCompany};
  const options = getQueryOptions(query);
  const journals = await Journal.find(journal, null, options).populate('lastModifiedBy', 'name');
  return journals;
};

const getJournalById = async (user, journalId, skipAuth = false) => {
  const journal = await Journal.findById(journalId);
  if (!journal) {
    throw new AppError(httpStatus.NOT_FOUND, 'Journal not found');
  } else if (!skipAuth) {
    if (parseInt(journal.user) !== parseInt(user._id)) {
      const journalCreator = await User.findById(journal.user)
      if (parseInt(journalCreator.company) !== parseInt(user.company)) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'Insufficient rights to access this journal information');
      }
    }
  }
  return journal;
};

const updateJournal = async (user, journalId, updateBody) => {
  const journal = await getJournalById(user, journalId);
  updateBody.lastModifiedBy = user._id;
  Object.assign(journal, updateBody);
  await journal.save();
  return journal;
};

const deleteJournal = async (user, journalId) => {
  const journal = await getJournalById(user, journalId);
  await journal.remove();
  return journal;
};

module.exports = {
  createJournal,
  getJournals,
  getJournalById,
  updateJournal,
  deleteJournal,
  makeDefaultJournal,
};
