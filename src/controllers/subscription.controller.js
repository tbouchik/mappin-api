const catchAsync = require('../utils/catchAsync');
const { subscriptionService } = require('../services');

const getSubscription = catchAsync(async (req, res) => {
  const subscription = await subscriptionService.getSubscriptionById(req.params.subscriptionId);
  res.send(subscription.transform());
});

const getSubscriptions = catchAsync(async (req, res) => {
  const subscriptions = await subscriptionService.getSubscriptions(req.query);
  const response = subscriptions.map(subscription => subscription.transform());
  res.send(response);
});

const createSubscription = catchAsync(async (req, res) => {
  const subscription = await subscriptionService.createSubscription(req.body);
  res.send(subscription);
});

module.exports = {
  getSubscription,
  getSubscriptions,
  createSubscription,
};
