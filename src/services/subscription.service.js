const httpStatus = require('http-status');
const { pick } = require('lodash');
const AppError = require('../utils/AppError');
const { Subscription } = require('../models');
const { getQueryOptions } = require('../utils/service.util');

const getSubscriptions = async query => {
  const filter = pick(query, ['type', 'credits']);
  const options = getQueryOptions(query);
  const subscriptions = await Subscription.find(filter, null, options);
  return subscriptions;
};

const getSubscriptionById = async subscriptionId => {
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) {
    throw new AppError(httpStatus.NOT_FOUND, 'Subscription not found');
  }
  return subscription;
};


module.exports = {
  getSubscriptions,
  getSubscriptionById,
};
