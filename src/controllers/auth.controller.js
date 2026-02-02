const authService = require('../services/auth.service');
const STATUS_CODES = require('../utils/statusCodes');

const register = async (req, res) => {
  try {
    const token = await authService.registerUser(req.body);
    res.status(STATUS_CODES.CREATED).json({ success: true, token });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const data = await authService.loginUser(email, password);
    res.json({ success: true, data });
  } catch (error) {
    res.status(STATUS_CODES.UNAUTHORIZED).json({ success: false, message: error.message });
  }
};

const sendEmailChangeOTP = async (req, res) => {
  try {
    const { newEmail } = req.body;
    const result = await authService.sendEmailChangeOTP(req.user._id, newEmail);
    res.json(result);
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const verifyEmailChangeOTP = async (req, res) => {
  try {
    const { newEmail, otp } = req.body;
    const result = await authService.verifyEmailChangeOTP(req.user._id, newEmail, otp);
    res.json(result);
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (error) {
    res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    const data = await authService.loginWithGoogle(token);
    res.json({ success: true, data });
  } catch (error) {
    res.status(STATUS_CODES.UNAUTHORIZED).json({ success: false, message: error.message });
  }
};

const facebookLogin = async (req, res) => {
  try {
    const { token } = req.body;
    const data = await authService.loginWithFacebook(token);
    res.json({ success: true, data });
  } catch (error) {
    res.status(STATUS_CODES.UNAUTHORIZED).json({ success: false, message: error.message });
  }
};

const appleLogin = async (req, res) => {
  try {
    const { idToken, user } = req.body;
    const data = await authService.loginWithApple(idToken, user);
    res.json({ success: true, data });
  } catch (error) {
    res.status(STATUS_CODES.UNAUTHORIZED).json({ success: false, message: error.message });
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  facebookLogin,
  appleLogin,
  sendEmailChangeOTP,
  verifyEmailChangeOTP,
  getMe,
};
