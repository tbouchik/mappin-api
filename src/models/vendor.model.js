const mongoose = require('mongoose');
const paginate = require('../plugins/paginate.plugin');

const vendorSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    code: {
      type: String,
      required: false,
      default:'',
      trim: true,
    },
    confirmed: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
    toObject: { getters: true },
    toJSON: { getters: true },
  },
);

vendorSchema.plugin(paginate);
vendorSchema.methods.transform = function() {
  const vendor = this;
  return vendor.toJSON();
};

const Vendor = mongoose.model('Vendor', vendorSchema);

module.exports = Vendor;
