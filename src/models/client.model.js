const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { omit, pick } = require('lodash');
const { roles } = require('../config/roles');

const clientSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      min:2,
      max:50
    },
    user: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
        required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      min:6,
      max:255,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
      max:1024,
      validate(value) {
        if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
          throw new Error('Password must contain at least one letter and one number');
        }
      },
    },
    company: {
      type: String,
      default: 'Trading Company',
    },
    isClient:{
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: roles,
      default: 'user',
    },
  },
  {
    timestamps: true,
    toObject: { getters: true },
    toJSON: { getters: true },
  }
);

clientSchema.methods.toJSON = function() {
  const client = this;
  return omit(client.toObject(), ['password']);
};

clientSchema.methods.transform = function() {
  const client = this;
  return pick(client.toJSON(), ['id', 'email', 'name', 'isClient', 'company']);
};

clientSchema.pre('save', async function(next) {
  const client = this;
  if (client.isModified('password')) {
    client.password = await bcrypt.hash(client.password, 8);
  }
  next();
});

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
