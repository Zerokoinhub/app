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

// Public routes
router.post('/register', userController.registerUser);
router.get('/invite/:inviteCode', userController.getInviteDetails);
router.post('/referral', userController.processReferral);
router.get('/count', userController.getUserCount);

// Protected routes (require Firebase authentication)
router.post('/sync', verifyFirebaseToken, userController.syncFirebaseUser);
router.get('/profile', verifyFirebaseToken, userController.getUserProfile);
router.put('/wallet-address', verifyFirebaseToken, userController.updateWalletAddress);

module.exports = router;