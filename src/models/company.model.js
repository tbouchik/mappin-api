const mongoose = require('mongoose');
const { pick } = require('lodash');

const companySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
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
    return pick(company.toJSON(), ['id', 'name']);
  };

const Company = mongoose.model('Company', companySchema);

module.exports = Company;
