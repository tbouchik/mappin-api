const mongoose = require('mongoose');
const paginate = require('../plugins/paginate.plugin');

const vendorSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    user: { // Intitulé
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
    },
    reference: { // unique Id dans le logiciel comptable (Sage) - Foreign Key
      type: String,
      required: false,
      default:'',
      trim: true,
    },
    code: { // Numéro de Compte
      type: String,
      required: false,
      default:'',
      trim: true,
    },
    address: { 
      type: String,
      required: false,
      default:'',
      trim: true,
    },
    refTiers: { 
      type: String,
      required: false,
      default:'',
      trim: true,
    },
    refTiersPayeur: { 
      type: String,
      required: false,
      default:'',
      trim: true,
    },
    currency: { 
      type: String,
      required: false,
      default:'',
      trim: true,
    },
    generalAccount: { 
      type: String,
      required: false,
      default:'',
      trim: true,
    },
    iban: { 
      type: String,
      required: false,
      default:'',
      trim: true,
    },
    bic: { 
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
