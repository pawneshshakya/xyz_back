const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password_hash: {
    type: String,
    required: true,
  },
  google_id: {
    type: String,
  },
  role: {
    type: String,
    enum: ['USER', 'MEDIATOR', 'ADMIN'],
    default: 'USER',
  },
  is_verified: {
    type: Boolean,
    default: false,
  },
  verification_source: {
    type: String, // PREMIUM | MANUAL
  },
  ads_disabled: {
    type: Boolean,
    default: false,
  },
  is_wallet_initialized: {
    type: Boolean,
    default: false,
  },
  reset_pin_otp: {
    type: String,
  },
  reset_pin_expires: {
    type: Date,
  },
  email_change_otp: {
    type: String,
  },
  email_change_expires: {
    type: Date,
  },
  full_name: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  game_uid_name: {
    type: String,
    trim: true,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
  },
  ff_max_uid: {
    type: String,
    trim: true,
  },
  guild_uid: {
    type: String,
    trim: true,
  },
  guild_name: {
    type: String,
    trim: true,
  },
  preferred_role: {
    type: String,
    enum: ['Rusher', 'Sniper', 'Support', 'Other', ''],
  },
  discord_tag: {
    type: String,
    trim: true,
  },
  bio: {
    type: String,
    trim: true,
  },
  instagram: {
    type: String,
    trim: true,
  },
  facebook: {
    type: String,
    trim: true,
  },
  x_twitter: {
    type: String,
    trim: true,
  },
  threads: {
    type: String,
    trim: true,
  },
  youtube: {
    type: String,
    trim: true,
  },
  discord_server: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String,
  },
  background_image: {
    type: String,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function () {
  if (!this.isModified('password_hash')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password_hash = await bcrypt.hash(this.password_hash, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password_hash);
};

module.exports = mongoose.model('User', UserSchema);
