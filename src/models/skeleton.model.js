const mongoose = require('mongoose');

const skeletonSchema = mongoose.Schema(
  {
    ossature: {
      type: Array,
      required: true,
    },
    user: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
        required: true,
      },
    googleMetadata: {},
    clientMapping: {}, // HashTable<ClientID; List<TemplateID>>
    bboxMappings: {}, // HashTable<ClientTempID; HashTable<TemplateKeyIndex; Bbox>>
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
