const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyFirebaseToken } = require('../middleware/firebaseAuth');
const upload = require('../config/multer');

// Public routes
router.get('/all', notificationController.getAllNotifications);
router.get('/debug/:id', notificationController.getRawNotification);

// Admin routes (protected by Firebase auth)
router.post('/add', verifyFirebaseToken, upload.single('image'), notificationController.addNotification);
router.put('/:id/mark-sent', verifyFirebaseToken, notificationController.markAsSent);
router.delete('/:id', verifyFirebaseToken, notificationController.deleteNotification);

module.exports = router; 