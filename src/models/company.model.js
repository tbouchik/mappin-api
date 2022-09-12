const mongoose = require('mongoose');
const { pick } = require('lodash');
let ObjectId = require('mongoose').Types.ObjectId; 

const companySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    subscription: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Subscription',
      default: ObjectId('5fe7f7610ac7f334019d9e99') // TODO Assign dynamically
    },
  },
  {
    timestamps: true,
    toObject: { getters: true },
    toJSON: { getters: true },
  }
);

companySchema.methods.toJSON = function() {
  const company = this;
  return company.toObject();
};

companySchema.methods.transform = function() {
  const company = this;
  return pick(company.toJSON(), ['id', 'name', 'subscription']);
};

const Company = mongoose.model('Company', companySchema);

module.exports = Company;
