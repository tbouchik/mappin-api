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
      required: [
        function() { return this.isBankStatement === false; },
        'filter (or template) is required if document is not a bank statement'
      ],
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
    isBankStatement: {
      type: Boolean,
      required: true,
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
    totalHt: {
      type: Number,
      default: '',
    },
    totalTtc: {
      type: Number,
      default: '',
    },
    vat: {
      type: String,
      default: '',
    },
    vendor: {
      type: String,
      default: '',
    },
    dateBeg: {
      type: Date,
    },
    dateEnd: {
      type: Date,
    },
    bankEntity: {
      type: String,
      default: '',
    },
    metadata: {},
    ggMetadata: {},
    osmium: [],
    bankOsmium: {},
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
    'isBankStatement',
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
    'bankOsmium',
    'totalHt',
    'totalTtc',
    'vendor',
    'vat',
    'dateBeg',
    'dateEnd',
    'bankEntity',
  ]);
};

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
