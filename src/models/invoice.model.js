const mongoose = require('mongoose');
const { pick } = require('lodash');
const status = require('./../enums/status');
const mimeType = require('./../enums/mimeType');

const invoiceSchema = mongoose.Schema(
  {
    user: {
        type: mongoose.SchemaTypes.ObjectId,
        ref:'User',
        required: true,
    },
    client: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'Client',
        required: true,
    },
    link: {
      type: String,
      required: true,
    },
    isBankStatement: {
      type: Boolean,
      default: false,
    },
    filter: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Filter',
      required: true
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
    status: {
      type: String,
      enum: [status.PENDING, status.SMELTED, status.VALIDATED, status.ARCHIVED, status.ERROR],
      default: status.PENDING,
    },
    name: {
      type: String,
      index: true,
    },
    totalHt: {
      type: Number,
      default: '',
    },
    totalTtc: {
      type: Number,
      default: '',
    },
    date: {
      type: Date,
    },
    vat: {
      type: String,
      default: '',
    },
    vendor: {
      type: String,
      default: '',
    },
    reference: {
        type: String,
        default: '',
    },
    orderNumber: {
        type: Number,
    },
    metadata: {},
    ggMetadata: {},
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
invoiceSchema.index(index);
invoiceSchema.methods.transform = function() {
  const invoice = this;
  return pick(invoice.toJSON(), [
    'id',
    'name',
    'user',
    'client',
    'metadata',
    'ggMetadata',
    'isArchived',
    'filter',
    'skeleton',
    'orderNumber',
    'mimeType',
    'isBankStatement',
    'status',
    'createdAt',
    'updatedAt',
    'alias',
    'totalHt',
    'invoiceDate',
    'totalTtc',
    'vendor',
    'date',
    'vat',
  ]);
};

invoiceSchema.methods.externalTransform = function() {
  const invoice = this;
  return pick(invoice.toJSON(), [
    'id',
    'name',
    'user',
    'mimeType',
    'status',
    'createdAt',
    'updatedAt',
    'alias',
    'totalHt',
    'orderNumber',
    'invoiceDate',
    'totalTtc',
    'vendor',
    'date',
    'vat',
  ]);
};

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
