const mongoose = require('mongoose');
const { pick } = require('lodash');

const subscriptionSchema = mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['trial', 'growth', 'enterprise'],
      required: true,
    },
    credits: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    toObject: { getters: true },
    toJSON: { getters: true },
    autoIndex: false,
  }
);
subscriptionSchema.methods.transform = function() {
  const user = this;
  return pick(user.toJSON(), [
    'id',
    'type',
    'credits'
  ]);
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
