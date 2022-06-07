const Joi = require('@hapi/joi');
const { objectId } = require('./custom.validation');

const createJournal = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    code: Joi.string().required(),
    type: Joi.string().required(),
  }),
};

const getJournals = {
  query: Joi.object().keys({
    userId: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    current: Joi.any(),
    page: Joi.number(),
    type: Joi.string(),
    name: Joi.string(),
    code: Joi.string(),
  }),
};

const getJournal = {
  params: Joi.object().keys({
    journalId: Joi.string().custom(objectId),
  }),
};

const updateJournal = {
  params: Joi.object().keys({
    journalId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      type: Joi.string(),
      name: Joi.string(),
      code: Joi.string(),
    })
    .min(1),
};

const deleteJournal = {
  params: Joi.object().keys({
    journalId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createJournal,
  getJournals,
  getJournal,
  updateJournal,
  deleteJournal,
};
