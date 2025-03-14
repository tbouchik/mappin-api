const Joi = require('@hapi/joi');
const { objectId } = require('./custom.validation');

const createVendor = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    code: Joi.string().allow(null, ''),
    reference: Joi.string().allow(null, ''),
    address: Joi.string().allow(null, ''),
    refTiers: Joi.string().allow(null, ''),
    refTiersPayer: Joi.string().allow(null, ''),
    currency: Joi.string().allow(null, ''),
    generalAccount: Joi.string().allow(null, ''),
    iban: Joi.string().allow(null, ''),
    bic: Joi.string().allow(null, ''),
    confirmed: Joi.boolean(),
  }),
};

const getVendors = {
  query: Joi.object().keys({
    userId: Joi.string().custom(objectId),
    lastModifiedBy: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    current: Joi.any(),
    page: Joi.number(),
    name: Joi.string().allow(null, ''),
    code: Joi.string().allow(null, ''),
    reference: Joi.string().allow(null, ''),
    address: Joi.string().allow(null, ''),
    refTiers: Joi.string().allow(null, ''),
    refTiersPayer: Joi.string().allow(null, ''),
    currency: Joi.string().allow(null, ''),
    generalAccount: Joi.string().allow(null, ''),
    iban: Joi.string().allow(null, ''),
    bic: Joi.string().allow(null, ''),
    confirmed: Joi.boolean(),
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
      lastModifiedBy: Joi.string().custom(objectId),
      name: Joi.string(),
      code: Joi.string(),
      confirmed: Joi.boolean(),
      reference: Joi.string().allow(null, ''),
      address: Joi.string().allow(null, ''),
      refTiers: Joi.string().allow(null, ''),
      refTiersPayer: Joi.string().allow(null, ''),
      currency: Joi.string().allow(null, ''),
      generalAccount: Joi.string().allow(null, ''),
      iban: Joi.string().allow(null, ''),
      bic: Joi.string().allow(null, ''),
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
