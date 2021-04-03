const mongoose = require('mongoose');
const { pick } = require('lodash');
const status = require('./../enums/status');
const mimeType = require('./../enums/mimeType');
const extraction = require('./../enums/extraction')

const documentSchema = mongoose.Schema(
  {
    link: {
      type: String,
      required: true,
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
    skeleton: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Skeleton',
      required: false,
    },
    isArchived: {
      type: Boolean,
      default:false,
    },
    mimeType: {
      type: String,
      enum: [mimeType.PNG, mimeType.JPG, mimeType.PDF],
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
      enum: [extraction.FORMS, extraction.TABLES, extraction.TEXT],
      default: extraction.TEXT,
    },
    status: {
      type: String,
      enum: [status.PENDING, status.SMELTED, status.VALIDATED, status.ARCHIVED, status.ERROR],
      default: status.PENDING,
    },
    name: {
      type: String,
      index: true,
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
    ggMetadata: {},
    osmium: [],
  },
  {
    versionKey: false,
    timestamps: true,
    toObject: { getters: true },
    toJSON: { getters: true },
    autoIndex: false,
  }
);
const index = { name: 'text'};
documentSchema.index(index);
documentSchema.methods.transform = function() {
  const user = this;
  return pick(user.toJSON(), [
    'id',
    'name',
    'user',
    'metadata',
    'ggMetadata',
    'uploadedBy',
    'validatedBy',
    'client',
    'isArchived',
    'filter',
    'skeleton',
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
