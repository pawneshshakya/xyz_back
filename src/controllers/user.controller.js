const userService = require('../services/user.service');
const STATUS_CODES = require('../utils/statusCodes');

const getProfile = async (req, res) => {
  try {
    const user = await userService.getUserProfile(req.user._id);
    res.json({ success: true, user });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const getPublicProfile = async (req, res) => {
  try {
    const user = await userService.getPublicUserProfile(req.params.id);
    res.json({ success: true, user });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await userService.updateUserProfile(req.user._id, req.body);
    res.json({ success: true, message: 'Profile updated successfully', user });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const updateEmail = async (req, res) => {
  try {
    const { newEmail, otp } = req.body;
    const user = await userService.updateUserEmail(req.user._id, newEmail, otp);
    res.json({ success: true, message: 'Email updated successfully', user });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProfile,
  getPublicProfile,
  updateProfile,
  updateEmail,
};
