const mongoose = require('mongoose');

const vendorSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      min: 2,
      max: 50,
    },
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    }
  },
  {
    timestamps: true,
    toObject: { getters: true },
    toJSON: { getters: true },
  },
);

vendorSchema.methods.transform = function() {
  const vendor = this;
  return vendor.toJSON();
};

const Vendor = mongoose.model('Vendor', vendorSchema);

module.exports = Vendor;
