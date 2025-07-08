const User = require('../models/User');
const crypto = require('crypto');
const { getTodayUTC, getNextSessionUnlockTime, SESSIONS_PER_DAY, SESSION_INTERVAL } = require('../utils/session');
const geoip = require('geoip-lite');
const { getName } = require('country-list');
const NotificationService = require('../services/notificationService');
const notificationService = new NotificationService();

const generateInviteCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 34; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

exports.registerUser = async (req, res) => {
  try {
    let inviteCode = generateInviteCode();
    while (await User.findOne({ inviteCode })) {
      inviteCode = generateInviteCode();
    }
    const user = new User({ inviteCode });
    await user.save();
    res.status(201).json({ inviteCode });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user' });
  }
};

exports.getInviteDetails = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const user = await User.findOne({ inviteCode });
    if (!user) return res.status(404).json({ message: 'Invite not found' });
    res.json({ inviteCode, recentAmount: user.recentAmount });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching invite details' });
  }
};

exports.processReferral = async (req, res) => {
  try {
    const { inviteCode, referredBy } = req.body;
    console.log('Processing referral:', { inviteCode, referredBy });

    const referrer = await User.findOne({ inviteCode: referredBy });
    if (!referrer) return res.status(400).json({ message: 'Invalid referrer invite code' });

    let newInviteCode = generateInviteCode();
    while (await User.findOne({ inviteCode: newInviteCode })) {
      newInviteCode = generateInviteCode();
    }

    const newUser = new User({ inviteCode: newInviteCode, referredBy });
    await newUser.save();

    referrer.recentAmount += 50;
    referrer.balance = (referrer.balance || 0) + 50;
    await referrer.save();

    res.status(200).json({ message: 'Referral processed', recentAmount: referrer.recentAmount });
  } catch (error) {
    console.error('Referral error:', error.message);
    res.status(500).json({ message: 'Error processing referral', error: error.message });
  }
};

exports.syncFirebaseUser = async (req, res) => {
  try {
    const { uid, email, name } = req.user; // From Firebase auth middleware
    console.log('🔥 Syncing Firebase user:', { uid, email, name });

    // Check if user already exists
    let user = await User.findOne({ firebaseUid: uid });
    console.log('🔍 Existing user check result:', user ? 'Found' : 'Not found');

    // Get IP and country
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const geo = geoip.lookup(ip);
    const country = geo ? getName(geo.country) : null;

    if (user) {
      // Update existing user data
      console.log('📝 Updating existing user:', user.inviteCode);
      user.name = name || user.name;
      user.email = email || user.email;
      user.country = country;
      try {
        await user.save();
        console.log('✅ User updated successfully');
      } catch (saveError) {
        console.error('❌ Error saving updated user:', saveError);
        throw saveError;
      }

      res.status(200).json({
        message: 'User data updated successfully',
        user: {
          firebaseUid: user.firebaseUid,
          name: user.name,
          email: user.email,
          inviteCode: user.inviteCode,
          recentAmount: user.recentAmount,
          balance: user.balance,
          walletAddresses: user.walletAddresses,
          country: user.country
        }
      });
    } else {
      // Create new user with Firebase data
      console.log('✨ Creating new user for Firebase UID:', uid);
      let inviteCode = generateInviteCode();
      while (await User.findOne({ inviteCode })) {
        inviteCode = generateInviteCode();
      }

      const newUser = new User({
        firebaseUid: uid,
        name,
        email,
        inviteCode,
        country
      });

      try {
        await newUser.save();
        console.log('✅ User created successfully with invite code:', inviteCode);
      } catch (saveError) {
        console.error('❌ Error saving new user:', saveError);
        throw saveError;
      }

      res.status(201).json({
        message: 'User created successfully',
        user: {
          firebaseUid: newUser.firebaseUid,
          name: newUser.name,
          email: newUser.email,
          inviteCode: newUser.inviteCode,
          recentAmount: newUser.recentAmount,
          balance: newUser.balance,
          walletAddresses: newUser.walletAddresses,
          country: newUser.country
        }
      });
    }
  } catch (error) {
    console.error('Firebase user sync error:', error.message);
    res.status(500).json({ message: 'Error syncing user data', error: error.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const { uid } = req.user; // From Firebase auth middleware

    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      user: {
        firebaseUid: user.firebaseUid,
        name: user.name,
        email: user.email,
        inviteCode: user.inviteCode,
        referredBy: user.referredBy,
        recentAmount: user.recentAmount,
        balance: user.balance,
        walletAddresses: user.walletAddresses,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error.message);
    res.status(500).json({ message: 'Error fetching user profile', error: error.message });
  }
};

exports.getUserSessions = async (req, res) => {
  try {
    const { uid } = req.user; // From Firebase auth middleware
    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize sessions if they don't exist (for new users only)
    if (!user.sessions || user.sessions.length === 0) {
      user.sessions = [];
      for (let i = 1; i <= SESSIONS_PER_DAY; i++) {
        user.sessions.push({
          sessionNumber: i,
          unlockedAt: i === 1 ? new Date() : null, // First session is always unlocked
          completedAt: null,
          nextUnlockAt: null,
          isClaimed: false,
          isLocked: i > 1 // Sessions 2-4 start locked
        });
      }
      await user.save();
    }

    // Check and update locked sessions based on countdown
    const now = new Date();
    let sessionsUpdated = false;

    for (let session of user.sessions) {
      if (session.isLocked && session.nextUnlockAt && now >= session.nextUnlockAt) {
        session.isLocked = false;
        session.unlockedAt = new Date();
        session.nextUnlockAt = null;
        sessionsUpdated = true;
      }
    }

    if (sessionsUpdated) {
      await user.save();
    }

    res.status(200).json({ sessions: user.sessions });
  } catch (error) {
    console.error('Get user sessions error:', error.message);
    res.status(500).json({ message: 'Error fetching user sessions', error: error.message });
  }
};

exports.unlockNextSession = async (req, res) => {
  try {
    const { uid } = req.user; // From Firebase auth middleware
    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the next locked session
    const nextSession = user.sessions.find(session => !session.unlockedAt);
    if (!nextSession) {
      return res.status(400).json({ message: 'No more sessions to unlock' });
    }

    // Unlock the session
    nextSession.unlockedAt = new Date();
    await user.save();

    res.status(200).json({
      message: 'Session unlocked successfully',
      session: nextSession
    });
  } catch (error) {
    console.error('Unlock session error:', error.message);
    res.status(500).json({ message: 'Error unlocking session', error: error.message });
  }
};

exports.completeSession = async (req, res) => {
  try {
    const { uid } = req.user; // From Firebase auth middleware
    const { sessionNumber } = req.body;

    if (!sessionNumber || sessionNumber < 1 || sessionNumber > 4) {
      return res.status(400).json({ message: 'Valid sessionNumber (1-4) is required' });
    }

    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the session to complete
    const session = user.sessions.find(s => s.sessionNumber === sessionNumber);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (!session.unlockedAt) {
      return res.status(400).json({ message: 'Session is not unlocked yet' });
    }

    if (session.completedAt) {
      return res.status(400).json({ message: 'Session is already completed' });
    }

    // Mark session as completed
    session.completedAt = new Date();
    session.isClaimed = true;

    // Set up countdown for next session (cyclical: 1->2->3->4->1->2->3->4...)
    let nextSessionNumber;
    if (parseInt(sessionNumber) === 4) {
      // After session 4, cycle back to session 1 and reset all other sessions
      nextSessionNumber = 1;

      // Reset all sessions to look like first cycle
      user.sessions.forEach(s => {
        if (s.sessionNumber === 1) {
          // Session 1 will be unlocked after countdown
          s.isLocked = true;
          s.nextUnlockAt = new Date(Date.now() + SESSION_INTERVAL); // Use configured interval
          s.completedAt = null;
          s.isClaimed = false;
          s.unlockedAt = null;
        } else {
          // Sessions 2, 3, 4 reset to locked state (not completed)
          s.isLocked = true;
          s.nextUnlockAt = null;
          s.completedAt = null;
          s.isClaimed = false;
          s.unlockedAt = null;
        }
      });
    } else {
      // Normal progression to next session
      nextSessionNumber = sessionNumber + 1;

      const nextSession = user.sessions.find(s => s.sessionNumber === nextSessionNumber);
      if (nextSession) {
        // Set countdown duration
        const countdownDuration = SESSION_INTERVAL; // Use configured interval
        nextSession.isLocked = true;
        nextSession.nextUnlockAt = new Date(Date.now() + countdownDuration);
        // Reset next session state for cyclical progression
        nextSession.completedAt = null;
        nextSession.isClaimed = false;
        nextSession.unlockedAt = null;
      }
    }

    await user.save();

    // Use the same nextSessionNumber variable for response
    const response = {
      message: 'Session completed successfully',
      session: session,
      nextSession: user.sessions.find(s => s.sessionNumber === nextSessionNumber),
      sessionsReset: parseInt(sessionNumber) === 4 // True when cycling back to session 1
    };

    console.log(`Session ${sessionNumber} completed. Response:`, JSON.stringify(response, null, 2));

    res.status(200).json(response);
  } catch (error) {
    console.error('Complete session error:', error.message);
    res.status(500).json({ message: 'Error completing session', error: error.message });
  }
};

exports.updateWalletAddress = async (req, res) => {
  try {
    const { uid } = req.user; // From Firebase auth middleware

    console.log('📡 Backend: Received request body:', req.body);
    console.log('📡 Backend: Request headers:', req.headers);

    const { walletType, walletAddress } = req.body;

    console.log(`🔄 Updating wallet address for user ${uid}:`, { walletType, walletAddress });
    console.log('🔍 Backend: walletType type:', typeof walletType, 'value:', walletType);
    console.log('🔍 Backend: walletAddress type:', typeof walletAddress, 'value:', walletAddress);

    if (!walletType || walletAddress === undefined || walletAddress === null) {
      console.log('❌ Backend: Validation failed - missing required fields');
      return res.status(400).json({ message: 'walletType and walletAddress are required' });
    }

    // Validate wallet address format (basic validation for Ethereum addresses)
    // Allow empty address for disconnection
    if (walletAddress !== '' && (!walletAddress.startsWith('0x') || walletAddress.length !== 42)) {
      return res.status(400).json({ message: 'Invalid wallet address format. Must be a valid Ethereum address (0x...)' });
    }

    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the correct wallet address
    if (walletType === 'metamask') {
      user.walletAddresses.metamask = walletAddress;
      // Update wallet status based on whether address is empty or not
      if (walletAddress === '') {
        user.walletStatus = 'Not Connected';
      } else {
        user.walletStatus = 'Connected';
      }
    } else if (walletType === 'trustWallet') {
      user.walletAddresses.trustWallet = walletAddress;
      // Update wallet status based on whether address is empty or not
      if (walletAddress === '') {
        user.walletStatus = 'Not Connected';
      } else {
        user.walletStatus = 'Connected';
      }
    } else {
      return res.status(400).json({ message: 'Invalid walletType' });
    }

    await user.save();

    console.log(`✅ Wallet address updated successfully for user ${uid}`);

    res.status(200).json({
      message: 'Wallet address updated successfully',
      walletAddresses: user.walletAddresses
    });
  } catch (error) {
    console.error('Update wallet address error:', error.message);
    res.status(500).json({ message: 'Error updating wallet address', error: error.message });
  }
};

exports.getUserCount = async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.status(200).json({ count });
  } catch (error) {
    console.error('Get user count error:', error.message);
    res.status(500).json({ message: 'Error getting user count', error: error.message });
  }
};

// Manual reset sessions for testing
exports.resetUserSessions = async (req, res) => {
  try {
    const { uid } = req.user; // From Firebase auth middleware
    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Reset all sessions to initial state
    user.sessions.forEach(s => {
      s.completedAt = null;
      s.isClaimed = false;
      s.isLocked = s.sessionNumber === 1 ? false : true; // Only session 1 is unlocked
      s.nextUnlockAt = null;
      s.unlockedAt = s.sessionNumber === 1 ? new Date() : null; // Only session 1 is unlocked
    });

    await user.save();

    res.status(200).json({
      message: 'Sessions reset successfully',
      sessions: user.sessions
    });
  } catch (error) {
    console.error('Reset sessions error:', error.message);
    res.status(500).json({ message: 'Error resetting sessions', error: error.message });
  }
};

exports.incrementCalculatorUsage = async (req, res) => {
  try {
    const { uid } = req.user; // From Firebase auth middleware
    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.calculatorUsage = (user.calculatorUsage || 0) + 1;
    await user.save();
    res.status(200).json({ calculatorUsage: user.calculatorUsage });
  } catch (error) {
    console.error('Increment calculator usage error:', error.message);
    res.status(500).json({ message: 'Error incrementing calculator usage', error: error.message });
  }
};

exports.updateUserBalance = async (req, res) => {
  try {
    const { uid } = req.user; // From Firebase auth middleware
    const { amount } = req.body;

    if (typeof amount !== 'number') {
      return res.status(400).json({ message: 'Amount must be a number' });
    }

    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.balance = (user.balance || 0) + amount;
    await user.save();

    res.status(200).json({
      message: 'User balance updated successfully',
      newBalance: user.balance,
    });
  } catch (error) {
    console.error('Update user balance error:', error.message);
    res.status(500).json({ message: 'Error updating user balance', error: error.message });
  }
};

// FCM Token Management
exports.updateFCMToken = async (req, res) => {
  try {
    const { uid } = req.user; // From Firebase auth middleware
    const { fcmToken, deviceId, platform } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ message: 'FCM token is required' });
    }

    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize fcmTokens array if it doesn't exist
    if (!user.fcmTokens) {
      user.fcmTokens = [];
    }

    // Check if token already exists
    const existingTokenIndex = user.fcmTokens.findIndex(t => t.token === fcmToken);

    if (existingTokenIndex !== -1) {
      // Update existing token
      user.fcmTokens[existingTokenIndex].lastUsed = new Date();
      user.fcmTokens[existingTokenIndex].isActive = true;
      if (deviceId) user.fcmTokens[existingTokenIndex].deviceId = deviceId;
      if (platform) user.fcmTokens[existingTokenIndex].platform = platform;
    } else {
      // Add new token
      user.fcmTokens.push({
        token: fcmToken,
        deviceId: deviceId || null,
        platform: platform || null,
        isActive: true,
        lastUsed: new Date(),
        createdAt: new Date()
      });
    }

    // Validate the FCM token
    const validation = await notificationService.validateFCMToken(fcmToken);
    if (!validation.valid) {
      console.warn('Invalid FCM token provided:', fcmToken);
      // Still save it but mark as inactive
      if (existingTokenIndex !== -1) {
        user.fcmTokens[existingTokenIndex].isActive = false;
      } else {
        user.fcmTokens[user.fcmTokens.length - 1].isActive = false;
      }
    }

    await user.save();

    res.status(200).json({
      message: 'FCM token updated successfully',
      tokenValid: validation.valid
    });
  } catch (error) {
    console.error('Update FCM token error:', error.message);
    res.status(500).json({ message: 'Error updating FCM token', error: error.message });
  }
};

exports.removeFCMToken = async (req, res) => {
  try {
    const { uid } = req.user; // From Firebase auth middleware
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ message: 'FCM token is required' });
    }

    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.fcmTokens) {
      return res.status(404).json({ message: 'No FCM tokens found' });
    }

    // Remove the token
    user.fcmTokens = user.fcmTokens.filter(t => t.token !== fcmToken);
    await user.save();

    res.status(200).json({
      message: 'FCM token removed successfully'
    });
  } catch (error) {
    console.error('Remove FCM token error:', error.message);
    res.status(500).json({ message: 'Error removing FCM token', error: error.message });
  }
};

exports.updateNotificationSettings = async (req, res) => {
  try {
    const { uid } = req.user; // From Firebase auth middleware
    const { sessionUnlocked, pushEnabled } = req.body;

    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize notification settings if they don't exist
    if (!user.notificationSettings) {
      user.notificationSettings = {
        sessionUnlocked: true,
        pushEnabled: true
      };
    }

    // Update settings
    if (typeof sessionUnlocked === 'boolean') {
      user.notificationSettings.sessionUnlocked = sessionUnlocked;
    }
    if (typeof pushEnabled === 'boolean') {
      user.notificationSettings.pushEnabled = pushEnabled;
    }

    await user.save();

    res.status(200).json({
      message: 'Notification settings updated successfully',
      notificationSettings: user.notificationSettings
    });
  } catch (error) {
    console.error('Update notification settings error:', error.message);
    res.status(500).json({ message: 'Error updating notification settings', error: error.message });
  }
};

exports.uploadScreenshots = async (req, res) => {
  try {
    console.log('📸 Upload screenshots request received');
    console.log('📸 Files received:', req.files ? req.files.length : 0);
    console.log('📸 User from middleware:', req.user);

    const { uid } = req.user; // From Firebase auth middleware
    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      console.log('❌ User not found for uid:', uid);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ User found:', user.email);

    if (!req.files || req.files.length === 0) {
      console.log('❌ No files received in request');
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // req.files is an array of uploaded files
    const urls = req.files.map(file => {
      console.log('📸 Processing file:', file.originalname, 'URL:', file.path);
      return file.path;
    });

    console.log('📸 All file URLs:', urls);

    // Limit to 6 screenshots
    user.screenshots = urls.slice(0, 6);
    await user.save();

    console.log('✅ Screenshots saved to user:', user.screenshots);

    res.status(200).json({
      message: 'Screenshots uploaded successfully',
      screenshots: user.screenshots
    });
  } catch (error) {
    console.error('Upload screenshots error:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ message: 'Error uploading screenshots', error: error.message });
  }
};
