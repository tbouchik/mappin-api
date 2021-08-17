const Joi = require('@hapi/joi');
const { objectId } = require('./custom.validation');

const createFilter = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    keys: Joi.array().required(),
    description: Joi.string().allow(null, ''),
    type: Joi.string(),
  }),
};

const getFilters = {
  query: Joi.object().keys({
    userId: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number(),
    type: Joi.string(),
    current: Joi.string().custom(objectId),
    name: Joi.string(),
  }),
};

const getFilter = {
  params: Joi.object().keys({
    filterId: Joi.string().custom(objectId),
  }),
};

const updateFilter = {
  params: Joi.object().keys({
    filterId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      keys: Joi.array(),
      description: Joi.string().allow(null, ''),
      type: Joi.string(),
    })
    .min(1),
};

const deleteFilter = {
  params: Joi.object().keys({
    filterId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createFilter,
  getFilters,
  getFilter,
  updateFilter,
  deleteFilter,
};
