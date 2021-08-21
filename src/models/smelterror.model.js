const mongoose = require('mongoose');

const smeltErrorSchema = mongoose.Schema(
  {
    user: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
        required: true,
    },
    document: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'Document',
        required: true,
    },
    stack: {
        type: String,
    },
  },
  {
    timestamps: true,
    toObject: { getters: true },
    toJSON: { getters: true },
  },
);

smeltErrorSchema.methods.transform = function() {
  const smeltError = this;
  return smeltError.toJSON();
};

const SmeltError = mongoose.model('SmeltError', smeltErrorSchema);

module.exports = SmeltError;
