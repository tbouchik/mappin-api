const mongoose = require('mongoose');
const { prepareSkeletonMappingsForApi, prepareSkeletonMappingsForDB } = require('../miner/skeletons')

const skeletonSchema = mongoose.Schema(
  {
    ossature: {
      type: Array,
      required: true,
    },
    document: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Document',
      required: true,
    },
    isBankSkeleton:{
      type: Boolean,
      required:true,
    },
    bankEntity:{
      type: String,
      required: false,
    },
    signature:{
      type: String,
      required: true,
    },
    ggMappings: {},
    companyTemplateMapping: {}, // HashTable<ClientID; List<TemplateID>>
    bboxMappings: {}, // HashTable<ClientTempID; HashTable<TemplateKeyValue; Bbox>>
    refMappings: {}, 
    imputations: {},
    journalMappings: {},
    vendorMappings: {},
    paymentMappings: {}
  },
  {
    timestamps: true,
    minimize: false,
    toObject: { getters: true },
    toJSON: { getters: true },
  },
);

skeletonSchema.methods.toJSON = function() {
  let skeleton = this;
  skeleton = prepareSkeletonMappingsForApi(skeleton);
  return skeleton.toObject();
};

skeletonSchema.methods.transform = function() {
  let skeleton = this;
  return skeleton.toJSON();
};

skeletonSchema.pre('save', function(next) {
  let skeleton = this;
  skeleton = prepareSkeletonMappingsForDB(skeleton);
  next();
});

const Skeleton = mongoose.model('Skeleton', skeletonSchema);

module.exports = Skeleton;
