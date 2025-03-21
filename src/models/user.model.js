const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { omit, pick } = require('lodash');
const { roles } = require('../config/roles');
let ObjectId = require('mongoose').Types.ObjectId; 

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      min: 2,
      max: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      min: 6,
      max: 255,
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
      max: 1024,
      validate(value) {
        if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
          throw new Error('Password must contain at least one letter and one number');
        }
      },
    },
    company: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Company',
      required: true,
    },
    role: {
      type: String,
      enum: roles,
      default: 'admin',
    },
    subscription: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Subscription',
      default: ObjectId('5fe7f7610ac7f334019d9e99') // TODO Assign dynamically
    },
    counter: {
      type: Number,
      default:0,
    },
    activated: {
      type: Boolean,
      default: true,
    },
    blacklisted: {
      type: Boolean,
      default: false
    },
  },
  {
    timestamps: true,
    toObject: { getters: true },
    toJSON: { getters: true },
  }
);

userSchema.methods.toJSON = function() {
  const user = this;
  return omit(user.toObject(), ['password']);
};

userSchema.methods.transform = function() {
  const user = this;
  return pick(user.toJSON(), ['id', 'email', 'name', 'role', 'company', 'subscription', 'counter']);
};

userSchema.pre('save', async function(next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
