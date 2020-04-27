const mongoose = require('mongoose');
const { pick } = require('lodash');

const documentSchema = mongoose.Schema(
  {
    link: {
      type: String,
      required: true,
      index: true,
    },
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    name:{
      type: String,
    },
    metadata: {},
  },
  {
    timestamps: true,
    toObject: { getters: true },
    toJSON: { getters: true },
  }
);

documentSchema.methods.transform = function() {
  const user = this;
  return pick(user.toJSON(), ['id', 'name', 'metadata']);
};

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
