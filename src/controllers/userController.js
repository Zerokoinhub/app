const User = require('../models/User');
const crypto = require('crypto');
const { getTodayUTC, getNextSessionUnlockTime, SESSIONS_PER_DAY } = require('../utils/session');

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

    if (user) {
      // Update existing user data
      console.log('📝 Updating existing user:', user.inviteCode);
      user.name = name || user.name;
      user.email = email || user.email;
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
          balance: user.balance
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
        name: name,
        email: email,
        inviteCode: inviteCode
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
          balance: newUser.balance
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

    // Reset sessions if it's a new UTC day
    const todayUTC = getTodayUTC();
    if (!user.sessionsResetAt || user.sessionsResetAt < todayUTC) {
      user.sessions = [];
      for (let i = 1; i <= SESSIONS_PER_DAY; i++) {
        user.sessions.push({
          sessionNumber: i,
          unlockedAt: null,
          isClaimed: false
        });
      }
      user.lastSessionUnlockAt = null;
      user.sessionsResetAt = todayUTC;
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

exports.updateWalletAddress = async (req, res) => {
  try {
    const { uid } = req.user; // From Firebase auth middleware
    const { walletAddress } = req.body;

    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.walletAddress = walletAddress;
    await user.save();

    res.status(200).json({ 
      message: 'Wallet address updated successfully',
      walletAddress: user.walletAddress
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