const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { protect } = require('../middlewares/auth.middleware');

// All notification routes require authentication
router.use(protect);

router.post('/register-token', notificationController.registerToken);
router.post('/remove-token', notificationController.removeToken);
router.get('/', notificationController.getNotifications);
router.post('/mark-read', notificationController.markAsRead);

module.exports = router;
