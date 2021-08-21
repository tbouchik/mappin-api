const mongoose = require('mongoose');

const filterSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      min: 2,
      max: 50,
    },
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['bankStatement', 'invoice'],
    },
    description: {
        type: String,
    },
    keys: [],
  },
  {
    timestamps: true,
    toObject: { getters: true },
    toJSON: { getters: true },
  },
);

filterSchema.methods.transform = function() {
  const filter = this;
  return filter.toJSON();
};

const Filter = mongoose.model('Filter', filterSchema);

module.exports = Filter;
