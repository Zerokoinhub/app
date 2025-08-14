const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyFirebaseToken } = require('../middleware/firebaseAuth');
const upload = require('../config/multer');

// Public routes
router.get('/all', notificationController.getAllNotifications);
router.get('/debug/:id', notificationController.getRawNotification);

// User routes (protected by Firebase auth)
router.get('/with-read-status', verifyFirebaseToken, notificationController.getNotificationsWithReadStatus);
router.get('/unread-count', verifyFirebaseToken, notificationController.getUnreadNotificationCount);
router.post('/:notificationId/mark-read', verifyFirebaseToken, notificationController.markNotificationAsRead);
router.post('/mark-all-read', verifyFirebaseToken, notificationController.markAllNotificationsAsRead);

// Admin routes (protected by Firebase auth)
router.post('/add', verifyFirebaseToken, upload.single('image'), notificationController.addNotification);
router.post('/add-upcoming', verifyFirebaseToken, upload.single('image'), notificationController.addUpcomingNotification);
router.put('/:id/mark-sent', verifyFirebaseToken, notificationController.markAsSent);
router.post('/:id/send-push', verifyFirebaseToken, notificationController.sendPushNotification);
router.delete('/:id', verifyFirebaseToken, notificationController.deleteNotification);

module.exports = router; 