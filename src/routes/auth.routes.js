const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

const { protect } = require('../middlewares/auth.middleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.post('/facebook', authController.facebookLogin);
router.post('/apple', authController.appleLogin);
router.post('/send-email-otp', protect, authController.sendEmailChangeOTP);
router.post('/verify-email-otp', protect, authController.verifyEmailChangeOTP);
router.get('/me', protect, authController.getMe);

module.exports = router;
