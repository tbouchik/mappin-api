const Joi = require('@hapi/joi');
const { objectId } = require('./custom.validation');

const createClient = {
  body: Joi.object().keys({
    email: Joi.string()
      .required()
      .email(),
    name: Joi.string().required(),
    number: Joi.string(),
    company: Joi.string(),
    user: Joi.string(),
  }),
};

const getClients = {
  query: Joi.object().keys({
    userId: Joi.string().custom(objectId),
    companyId: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getClient = {
  params: Joi.object().keys({
    clientId: Joi.string().custom(objectId),
  }),
};

const updateClient = {
  params: Joi.object().keys({
    clientId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      name: Joi.string(),
      company: Joi.string(),
      number: Joi.string(),
    })
    .min(1),
};

const deleteClient = {
  params: Joi.object().keys({
    clientId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
};
