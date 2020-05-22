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
    mimeType: {
      type: String,
      required: true,
    },
    alias: {
      type: String,
      required: true,
    },
    businessPurpose: {
      type: String,
      required: true,
    },
    extractionType: {
      type: String,
      required: true,
    },
    status: {
      type: String,
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
  return pick(user.toJSON(), ['id', 'name', 'metadata', 'mimeType', 'businessPurpose', 'extractionType', 'status','createdAt','updatedAt']);
};

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
