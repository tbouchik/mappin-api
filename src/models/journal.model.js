const mongoose = require('mongoose');

const journalSchema = mongoose.Schema(
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
    lastModifiedBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    isDefault: {
      type: Boolean,
    },
    type: {
      type: String,
      enum: ['achats', 'ventes', 'tresorerie', 'general', 'situation'],
    }
  },
  {
    timestamps: true,
    toObject: { getters: true },
    toJSON: { getters: true },
  },
);

journalSchema.methods.transform = function() {
  const journal = this;
  return journal.toJSON();
};

const Journal = mongoose.model('Journal', journalSchema);

module.exports = Journal;
