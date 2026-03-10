const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const STATUS_CODES = require('../utils/statusCodes');

const registerToken = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'FCM token is required' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'User not found' });
        }

        // Add token if it doesn't already exist
        if (!user.fcm_tokens) {
            user.fcm_tokens = [];
        }
        if (!user.fcm_tokens.includes(token)) {
            user.fcm_tokens.push(token);
            await user.save();
        }

        res.json({ success: true, message: 'FCM token registered successfully' });
    } catch (error) {
        res.status(STATUS_CODES.SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const removeToken = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'FCM token is required' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'User not found' });
        }

        if (user.fcm_tokens) {
            user.fcm_tokens = user.fcm_tokens.filter(t => t !== token);
            await user.save();
        }

        res.json({ success: true, message: 'FCM token removed successfully' });
    } catch (error) {
        res.status(STATUS_CODES.SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const getNotifications = async (req, res) => {
    try {
        const userId = req.user._id.toString();

        // Fetch user-specific notifications and broadcasts ('ALL')
        const notifications = await Notification.find({
            $or: [
                { userId: userId },
                { userId: 'ALL' }
            ]
        }).sort({ createdAt: -1 }).limit(50); // Get latest 50

        res.json({ success: true, data: notifications });
    } catch (error) {
        res.status(STATUS_CODES.SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.body;
        const userId = req.user._id.toString();

        const notification = await Notification.findById(notificationId);
        if (!notification) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'Notification not found' });
        }

        // Don't allow marking someone else's targeted notification as read
        if (notification.userId !== userId && notification.userId !== 'ALL') {
            return res.status(STATUS_CODES.FORBIDDEN).json({ success: false, message: 'Forbidden' });
        }

        // For 'ALL' broadcasts, we'd ideally track read state per user in a separate collection or array.
        // simpler implementation for 'ALL' is just not throwing an error here.
        if (notification.userId !== 'ALL') {
            notification.isRead = true;
            await notification.save();
        }

        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        res.status(STATUS_CODES.SERVER_ERROR).json({ success: false, message: error.message });
    }
};

module.exports = {
    registerToken,
    removeToken,
    getNotifications,
    markAsRead,
};
