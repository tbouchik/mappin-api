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
    client: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Client',
      required: true,
    },
    filter: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Filter',
      required: true,
    },
    mimeType: {
      type: String,
      enum: ['image/png', 'image/jpeg', 'application/pdf'],
      required: true,
    },
    alias: {
      type: String,
      required: true,
    },
    businessPurpose: {
      type: String,
      default: 'Invoice',
    },
    extractionType: {
      type: String,
      enum: ['FORMS', 'TABLES', 'TEXT'],
      default: 'FORMS',
    },
    status: {
      type: String,
      enum: ['pending', 'smelted', 'validated'],
      default: 'pending',
    },
    name: {
      type: String,
    },
    uploadedBy: {
      type: String,
      required: true,
      default: '',
    },
    validatedBy: {
      type: String,
      default: '',
    },
    metadata: {},
    osmium: [],
  },
  {
    timestamps: true,
    toObject: { getters: true },
    toJSON: { getters: true },
  }
);

documentSchema.methods.transform = function() {
  const user = this;
  return pick(user.toJSON(), [
    'id',
    'name',
    'metadata',
    'uploadedBy',
    'validatedBy',
    'client',
    'filter',
    'mimeType',
    'businessPurpose',
    'extractionType',
    'status',
    'createdAt',
    'updatedAt',
    'alias',
    'osmium',
  ]);
};

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
