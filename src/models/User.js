const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  inviteCode: {
    type: String,
    unique: true,
    required: true
  },
  referredBy: {
    type: String,
    default: null
  },
  recentAmount: {
    type: Number,
    default: 0
  },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  balance: {
    type: Number,
    default: 0
  },
  walletAddresses: {
    metamask: { type: String, default: null },
    trustWallet: { type: String, default: null }
  },
  walletStatus: {
    type: String,
    enum: ['Not Connected', 'Connected'],
    default: 'Not Connected'
  },
  screenshots: {
    type: [String],
    default: []
  },
  sessions: [{
    sessionNumber: Number,
    unlockedAt: Date,
    completedAt: Date,
    nextUnlockAt: Date,
    isClaimed: {
      type: Boolean,
      default: false
    },
    isLocked: {
      type: Boolean,
      default: false
    }
  }],
  lastSessionUnlockAt: Date,
  sessionsResetAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  calculatorUsage: {
    type: Number,
    default: 0
  },
  country: {
    type: String,
    default: null
  },
  fcmTokens: [{
    token: {
      type: String,
      required: true
    },
    deviceId: {
      type: String,
      default: null
    },
    platform: {
      type: String,
      enum: ['android', 'ios'],
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastUsed: {
      type: Date,
      default: Date.now
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  notificationSettings: {
    sessionUnlocked: {
      type: Boolean,
      default: true
    },
    pushEnabled: {
      type: Boolean,
      default: true
    }
  },
  readNotifications: [{
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notification',
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
});

module.exports = mongoose.model('User', userSchema);