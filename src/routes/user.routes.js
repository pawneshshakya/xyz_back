const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get('/profile', protect, userController.getProfile);
router.get('/:id', protect, userController.getPublicProfile);
router.put('/profile', protect, userController.updateProfile);
router.put('/profile/email', protect, userController.updateEmail);

module.exports = router;
