// const express = require('express');
// const router = express.Router();
// const userController = require('../controllers/userController');
// const { getUserSessions, unlockNextSession, getUserProfile } = require('../controllers/userController');
// const auth = require('../middleware/auth');

// router.post('/register', userController.registerUser);
// router.get('/invite/:inviteCode', userController.getInviteDetails);
// router.post('/referral', userController.processReferral);
// router.get('/sessions', auth, getUserSessions);
// router.post('/unlock', auth, unlockNextSession);
// router.post('/sync', auth, userController.syncFirebaseUser);
// router.get('/profile', auth, getUserProfile);

// module.exports = router;

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyFirebaseToken } = require('../middleware/firebaseAuth');
const { getUserSessions, unlockNextSession, completeSession } = require('../controllers/userController');
const upload = require('../config/multer');

router.post('/register', userController.registerUser);
router.get('/invite/:inviteCode', userController.getInviteDetails);
router.post('/referral', userController.processReferral);
router.get('/sessions', verifyFirebaseToken, getUserSessions);
router.post('/unlock', verifyFirebaseToken, unlockNextSession);
router.post('/complete-session', verifyFirebaseToken, completeSession);
router.post('/reset-sessions', verifyFirebaseToken, userController.resetUserSessions);
router.post('/sync', verifyFirebaseToken, userController.syncFirebaseUser);
router.get('/profile', verifyFirebaseToken, userController.getUserProfile);
router.put('/wallet-address', verifyFirebaseToken, userController.updateWalletAddress);
router.get('/count', userController.getUserCount);
router.put('/calculator-usage', verifyFirebaseToken, userController.incrementCalculatorUsage);
router.put('/update-balance', verifyFirebaseToken, userController.updateUserBalance);
router.post('/upload-screenshots', verifyFirebaseToken, (req, res, next) => {
  console.log('🔍 Route middleware - User:', req.user);
  console.log('🔍 Route middleware - Headers:', req.headers['content-type']);
  next();
}, upload.array('screenshots', 6), (req, res, next) => {
  console.log('🔍 After multer - Files:', req.files ? req.files.length : 0);
  next();
}, userController.uploadScreenshots);

// FCM Token Management Routes
router.post('/fcm-token', verifyFirebaseToken, userController.updateFCMToken);
router.delete('/fcm-token', verifyFirebaseToken, userController.removeFCMToken);
router.put('/notification-settings', verifyFirebaseToken, userController.updateNotificationSettings);

module.exports = router;
