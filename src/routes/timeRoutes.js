const express = require('express');
const router = express.Router();
const timeController = require('../controllers/timeController');
const { verifyFirebaseToken } = require('../middleware/firebaseAuth');

// Get server time for synchronization
router.get('/server-time', verifyFirebaseToken, timeController.getServerTime);

// Validate session timing against server time
router.post('/validate-session', verifyFirebaseToken, timeController.validateSessionTiming);

// Get time validation status
router.get('/validation-status', verifyFirebaseToken, timeController.getTimeValidationStatus);

// Force session unlock based on server time
router.post('/force-unlock', verifyFirebaseToken, timeController.forceSessionUnlock);

module.exports = router;
