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
const { getUserSessions, unlockNextSession } = require('../controllers/userController');

router.post('/register', userController.registerUser);
router.get('/invite/:inviteCode', userController.getInviteDetails);
router.post('/referral', userController.processReferral);
router.get('/sessions', verifyFirebaseToken, getUserSessions);
router.post('/unlock', verifyFirebaseToken, unlockNextSession);
router.post('/sync', verifyFirebaseToken, userController.syncFirebaseUser);
router.get('/profile', verifyFirebaseToken, userController.getUserProfile);
router.put('/wallet-address', verifyFirebaseToken, userController.updateWalletAddress);
router.get('/count', userController.getUserCount);
router.put('/calculator-usage', verifyFirebaseToken, userController.incrementCalculatorUsage);

module.exports = router;