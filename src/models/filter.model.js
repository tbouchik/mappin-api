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
    lastModifiedBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['bankStatement', 'invoice'],
    },
    isActiveDC: {
      type: Boolean,
      default: true,
    },
    isActiveJournal: {
      type: Boolean,
      default: true,
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
