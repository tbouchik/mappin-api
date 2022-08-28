const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { journalService } = require('../services');

const createJournal = catchAsync(async (req, res) => {
  const journal = await journalService.createJournal(req.user, req.body);
  res.status(httpStatus.CREATED).send(journal.transform());
});

const makeDefaultJournal = catchAsync(async (req, res) => {
  await journalService.makeDefaultJournal(req.user, req.body);
  res.json({ done: true });
});

const getJournals = catchAsync(async (req, res) => {
  const journals = await journalService.getJournals(req.user, req.query);
  const response = journals.map(journal => journal.transform());
  res.send(response);
});

const getJournal = catchAsync(async (req, res) => {
  const journal = await journalService.getJournalById(req.user, req.params.journalId);
  res.send(journal.transform());
});

const updateJournal = catchAsync(async (req, res) => {
  const journal = await journalService.updateJournal(req.user, req.params.journalId, req.body);
  res.send(journal.transform());
});

const deleteJournal = catchAsync(async (req, res) => {
  await journalService.deleteJournal(req.user, req.params.journalId);
  res.status(httpStatus.NO_CONTENT).send();
});

const getDefaultJournalId = catchAsync(async (req, res) => {
  const journalId = await journalService.getDefaultJournalId(req.user);
  res.send(journalId);
});

module.exports = {
  createJournal,
  getJournals,
  getJournal,
  updateJournal,
  deleteJournal,
  getDefaultJournalId,
  makeDefaultJournal,
};
