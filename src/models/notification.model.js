const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    userId: {
        type: String, // Can be a User ObjectId string or 'ALL' for broadcasts
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
    },
    body: {
        type: String,
        required: true,
    },
    data: {
        type: Object,
        default: {},
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    type: {
        type: String, // e.g. 'SYSTEM', 'ANNOUNCEMENT', 'MATCH_UPDATE'
        default: 'SYSTEM',
    },
}, {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
});

module.exports = mongoose.model('Notification', NotificationSchema);
