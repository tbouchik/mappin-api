const catchAsync = require('../utils/catchAsync');
const { Subscription } = require('../models');
const httpStatus = require('http-status');

const getSubscriptions = catchAsync(async (req, res) => {
  const filter = {};
  const subs = await Subscription.find(filter, null);
  res.send(subs);
});

const createSubscription = catchAsync(async (req, res) => {
    const sub = await Subscription.create(req.body);
    res.status(httpStatus.CREATED).send(sub.transform());
  });


module.exports = {
  getSubscriptions,
  createSubscription,
};
