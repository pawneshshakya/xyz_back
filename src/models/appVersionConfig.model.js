const mongoose = require('mongoose');

const AppVersionConfigSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ['android', 'ios'],
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    latestVersion: {
      type: String,
      required: true,
      trim: true,
    },
    minSupportedVersion: {
      type: String,
      required: true,
      trim: true,
    },
    graceDays: {
      type: Number,
      default: 5,
    },
    forceUpdate: {
      type: Boolean,
      default: false,
    },
    message: {
      type: String,
      trim: true,
    },
    storeUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('AppVersionConfig', AppVersionConfigSchema);
