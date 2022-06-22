const Joi = require('@hapi/joi');
const { objectId } = require('./custom.validation');

const createVendor = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    code: Joi.string().required(),
    type: Joi.string().required(),
  }),
};

const getVendors = {
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

const getVendor = {
  params: Joi.object().keys({
    vendorId: Joi.string().custom(objectId),
  }),
};

const updateVendor = {
  params: Joi.object().keys({
    vendorId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      type: Joi.string(),
      name: Joi.string(),
      code: Joi.string(),
    })
    .min(1),
};

const deleteVendor = {
  params: Joi.object().keys({
    vendorId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createVendor,
  getVendors,
  getVendor,
  updateVendor,
  deleteVendor,
};
