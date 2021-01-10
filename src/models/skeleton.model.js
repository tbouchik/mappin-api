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
    googleMetadata: null,
    clientTemplateMapping: null, // HashTable<ClientID; List<TemplateID>>
    bboxMappings: null, // HashTable<ClientTempID; HashTable<TemplateKeyValue; Bbox>>
  },
  {
    timestamps: true,
    toObject: { getters: true },
    toJSON: { getters: true },
  },
);

skeletonSchema.methods.toJSON = function() {
  const skeleton = this;
  return skeleton.toObject();
};

skeletonSchema.methods.transform = function() {
  const skeleton = this;
  return skeleton.toJSON();
};

const Skeleton = mongoose.model('Skeleton', skeletonSchema);

module.exports = Skeleton;
