const User = require('../models/user.model');

const getUserProfile = async (userId) => {
  const user = await User.findById(userId).select('-password_hash');
  if (!user) throw new Error('User not found');
  return user;
};

const updateUserProfile = async (userId, profileData) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  // Update fields
  const allowedUpdates = [
    'full_name', 'phone', 'game_uid_name', 'gender',
    'ff_max_uid', 'guild_uid', 'guild_name', 'preferred_role',
    'discord_tag', 'bio', 'instagram', 'facebook',
    'x_twitter', 'threads', 'youtube', 'discord_server',
    'avatar', 'background_image'
  ];

  allowedUpdates.forEach(field => {
    if (profileData[field] !== undefined) {
      user[field] = profileData[field];
    }
  });

  await user.save();
  return user;
};

const updateUserEmail = async (userId, newEmail, otp) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  if (user.email_change_otp !== otp || user.email_change_expires < Date.now()) {
    throw new Error('Invalid or expired OTP');
  }

  // Check if new email is already taken by another user
  const emailExists = await User.findOne({ email: newEmail, _id: { $ne: userId } });
  if (emailExists) throw new Error('Email already in use');

  user.email = newEmail;
  user.email_change_otp = undefined;
  user.email_change_expires = undefined;
  await user.save();

  return user;
};



const getPublicUserProfile = async (userId) => {
  const user = await User.findById(userId).select(
    'username full_name game_uid_name gender ff_max_uid guild_uid guild_name preferred_role discord_tag bio instagram facebook x_twitter threads youtube discord_server avatar background_image role is_verified created_at'
  );
  if (!user) throw new Error('User not found');
  return user;
};

module.exports = {
  getUserProfile,
  getPublicUserProfile,
  updateUserProfile,
  updateUserEmail,
};
