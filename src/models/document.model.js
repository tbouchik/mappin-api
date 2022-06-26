const mongoose = require('mongoose');
const { pick } = require('lodash');
const status = require('./../enums/status');
const mimeType = require('./../enums/mimeType');
const extraction = require('./../enums/extraction');
const { runRules, runRulesValidated } = require('./../utils/validator');

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
    journal: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Journal',
    },
    vendor: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Vendor',
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
    invoiceDate: {
      type: Date,
    },
    vat: {
      type: Number,
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
    references: [],
    osmium: [],
    bankOsmium: {},
    rules: {},
    rulesValidated:{
      type: Boolean,
      default: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
    toObject: { getters: true },
    toJSON: { getters: true },
    autoIndex: false,
    minimize: false,
  }
);
const index = { name: 'text'};
documentSchema.index(index);
documentSchema.methods.transform = function() {
  const document = this;
  return pick(document.toJSON(), [
    'id',
    'name',
    'user',
    'metadata',
    'ggMetadata',
    'references',
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
    'invoiceDate',
    'journal',
    'totalTtc',
    'vendor',
    'vat',
    'dateBeg',
    'dateEnd',
    'bankEntity',
    'rules',
  ]);
};

documentSchema.pre('save', function(next) {
  const document = this
  this.rules = runRules(document)
  this.rulesValidated = runRulesValidated(document)
  next();
});

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
