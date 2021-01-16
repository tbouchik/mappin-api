const mongoose = require('mongoose');

const skeletonSchema = mongoose.Schema(
  {
    ossature: {
      type: Array,
      required: true,
    },
    accountingNumber: {
      type: Number,
      required: false,
    },
    document: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Document',
      required: true,
    },
    googleMetadata: {},
    clientTemplateMapping: {}, // HashTable<ClientID; List<TemplateID>>
    bboxMappings: {}, // HashTable<ClientTempID; HashTable<TemplateKeyValue; Bbox>>
  },
  {
    timestamps: true,
    toObject: { getters: true },
    toJSON: { getters: true },
  },
);

skeletonSchema.methods.toJSON = function() {
  const skeleton = this;
  skeleton.clientTemplateMapping =  new Map(Object.entries(skeleton.clientTemplateMapping));
  skeleton.bboxMappings = new Map(Object.entries(skeleton.bboxMappings));
  return skeleton.toObject();
};

skeletonSchema.methods.transform = function() {
  const skeleton = this;
  return skeleton.toJSON();
};

skeletonSchema.pre('save', async function(next) {
  const skeleton = this;
  skeleton.clientTemplateMapping = Object.fromEntries(skeleton.clientTemplateMapping);
  skeleton.bboxMappings = Object.fromEntries(skeleton.bboxMappings);
  next();
});

const Skeleton = mongoose.model('Skeleton', skeletonSchema);

module.exports = Skeleton;
