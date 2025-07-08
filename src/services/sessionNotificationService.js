const User = require('../models/User');
const NotificationService = require('./notificationService');
const notificationService = new NotificationService();

class SessionNotificationService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.checkInterval = 30 * 1000; // Check every 30 seconds
  }

  /**
   * Start the background service to check for expired session timers
   */
  start() {
    if (this.isRunning) {
      console.log('📱 Session notification service is already running');
      return;
    }

    console.log('🚀 Starting session notification service...');
    this.isRunning = true;
    
    // Run immediately on start
    this.checkExpiredSessions();
    
    // Then run at intervals
    this.intervalId = setInterval(() => {
      this.checkExpiredSessions();
    }, this.checkInterval);

    console.log(`✅ Session notification service started (checking every ${this.checkInterval / 1000}s)`);
  }

  /**
   * Stop the background service
   */
  stop() {
    if (!this.isRunning) {
      console.log('📱 Session notification service is not running');
      return;
    }

    console.log('🛑 Stopping session notification service...');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ Session notification service stopped');
  }

  /**
   * Check for expired session timers and send notifications
   */
  async checkExpiredSessions() {
    try {
      const now = new Date();
      console.log(`🔍 Checking for expired sessions at ${now.toISOString()}`);

      // Find users with sessions that should be unlocked
      const usersWithExpiredSessions = await User.find({
        'sessions': {
          $elemMatch: {
            isLocked: true,
            nextUnlockAt: { $lte: now }
          }
        },
        'notificationSettings.pushEnabled': { $ne: false },
        'notificationSettings.sessionUnlocked': { $ne: false },
        'fcmTokens': { $exists: true, $not: { $size: 0 } }
      });

      console.log(`📊 Found ${usersWithExpiredSessions.length} users with expired sessions`);

      let notificationsSent = 0;
      let sessionsUnlocked = 0;

      for (const user of usersWithExpiredSessions) {
        try {
          let userUpdated = false;
          const expiredSessions = [];

          // Check each session for expiration
          for (const session of user.sessions) {
            if (session.isLocked && session.nextUnlockAt && session.nextUnlockAt <= now) {
              // Unlock the session
              session.isLocked = false;
              session.unlockedAt = new Date();
              session.nextUnlockAt = null;
              userUpdated = true;
              sessionsUnlocked++;
              expiredSessions.push(session.sessionNumber);
              
              console.log(`🔓 Unlocked session ${session.sessionNumber} for user ${user.firebaseUid}`);
            }
          }

          // Save user changes if any sessions were unlocked
          if (userUpdated) {
            await user.save();
          }

          // Send notifications for each expired session
          if (expiredSessions.length > 0) {
            await this.sendSessionUnlockedNotifications(user, expiredSessions);
            notificationsSent += expiredSessions.length;
          }

        } catch (userError) {
          console.error(`❌ Error processing user ${user.firebaseUid}:`, userError);
        }
      }

      if (sessionsUnlocked > 0 || notificationsSent > 0) {
        console.log(`✅ Processed: ${sessionsUnlocked} sessions unlocked, ${notificationsSent} notifications sent`);
      }

    } catch (error) {
      console.error('❌ Error checking expired sessions:', error);
    }
  }

  /**
   * Send session unlocked notifications to a user
   * @param {Object} user - User document
   * @param {Array} sessionNumbers - Array of session numbers that were unlocked
   */
  async sendSessionUnlockedNotifications(user, sessionNumbers) {
    if (!user.fcmTokens || user.fcmTokens.length === 0) {
      console.log(`⚠️ No FCM tokens for user ${user.firebaseUid}`);
      return;
    }

    // Get active FCM tokens
    const activeTokens = user.fcmTokens.filter(token => token.isActive);
    
    if (activeTokens.length === 0) {
      console.log(`⚠️ No active FCM tokens for user ${user.firebaseUid}`);
      return;
    }

    // Send notification for each session (or combine if multiple)
    let notificationBody;
    if (sessionNumbers.length === 1) {
      notificationBody = `Session ${sessionNumbers[0]} unlocked! Complete the session to claim 30 Zero Koins.`;
    } else {
      notificationBody = `Sessions ${sessionNumbers.join(', ')} unlocked! Complete them to claim Zero Koins.`;
    }

    const invalidTokens = [];

    // Send to all active tokens
    for (const tokenData of activeTokens) {
      try {
        const result = await notificationService.sendNotificationToUser(
          tokenData.token,
          'ZeroKoin',
          notificationBody,
          {
            type: 'session_unlocked',
            sessionNumbers: sessionNumbers.join(','),
            userId: user.firebaseUid
          }
        );

        if (result.success) {
          console.log(`✅ Notification sent to user ${user.firebaseUid} (${tokenData.platform || 'unknown'})`);
          
          // Update last used timestamp
          tokenData.lastUsed = new Date();
        } else if (result.shouldRemoveToken) {
          console.log(`🗑️ Marking invalid token for removal: ${tokenData.token.substring(0, 20)}...`);
          invalidTokens.push(tokenData.token);
        }

      } catch (error) {
        console.error(`❌ Error sending notification to token ${tokenData.token.substring(0, 20)}...:`, error);
      }
    }

    // Remove invalid tokens
    if (invalidTokens.length > 0) {
      user.fcmTokens = user.fcmTokens.filter(token => !invalidTokens.includes(token.token));
      await user.save();
      console.log(`🗑️ Removed ${invalidTokens.length} invalid tokens for user ${user.firebaseUid}`);
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      nextCheck: this.intervalId ? new Date(Date.now() + this.checkInterval) : null
    };
  }

  /**
   * Manually trigger a check (for testing)
   */
  async triggerCheck() {
    console.log('🔧 Manually triggering session check...');
    await this.checkExpiredSessions();
  }
}

module.exports = new SessionNotificationService();
