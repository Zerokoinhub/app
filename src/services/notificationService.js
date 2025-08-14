const { admin } = require('../config/firebase');

class NotificationService {
  constructor() {
    this.messaging = admin.messaging();
  }

  /**
   * Send push notification to a specific user
   * @param {string} fcmToken - User's FCM token
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {object} data - Additional data payload
   */
  async sendNotificationToUser(fcmToken, title, body, data = {}) {
    try {
      if (!fcmToken) {
        console.warn('No FCM token provided for notification');
        return { success: false, error: 'No FCM token' };
      }

      const message = {
        token: fcmToken,
        notification: {
          title,
          body,
          ...(data.image && { image: data.image })
        },
        data: {
          ...data,
          timestamp: Date.now().toString(),
          // Ensure all data values are strings
          ...(data.image && { image: data.image }),
          title: title,
          body: body,
          // Add action data for handling button clicks
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          action_open: 'true',
          action_dismiss: 'true',
        },
        android: {
          notification: {
            title,
            body,
            icon: 'ic_stat_notificationlogo',
            color: '#0682A2',
            channelId: 'zerokoin_notifications',
            priority: 'high',
            defaultSound: true,
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            ...(data.image && { imageUrl: data.image }),
          },
          priority: 'high',
          // Add action buttons for Android
          data: {
            ...Object.fromEntries(
              Object.entries(data).map(([key, value]) => [key, String(value)])
            ),
            timestamp: Date.now().toString(),
            title: String(title),
            body: String(body),
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            action_open: 'true',
            action_dismiss: 'true',
            has_actions: 'true'
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title,
                body,
              },
              badge: 1,
              sound: 'default',
              'content-available': 1,
              category: 'ZEROKOIN_CATEGORY',
              ...(data.image && { 'mutable-content': 1 }),
            },
            // Custom data for iOS action handling
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            action_open: 'true',
            action_dismiss: 'true',
          },
          headers: {
            'apns-priority': '10',
          },
          ...(data.image && {
            fcm_options: {
              image: data.image
            }
          }),
        },
      };

      const response = await this.messaging.send(message);
      console.log('✅ Push notification sent successfully:', response);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
      
      // Handle invalid token errors
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        console.log('🗑️ Invalid FCM token, should be removed from database');
        return { success: false, error: 'Invalid token', shouldRemoveToken: true };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Send session unlocked notification
   * @param {string} fcmToken - User's FCM token
   * @param {number} sessionNumber - Session number that was unlocked
   */
  async sendSessionUnlockedNotification(fcmToken, sessionNumber) {
    const title = 'ZeroKoin';
    const body = `Session ${sessionNumber} unlocked! Complete the session to claim 30 Zero Koins.`;
    const data = {
      type: 'session_unlocked',
      sessionNumber: sessionNumber.toString(),
    };

    return await this.sendNotificationToUser(fcmToken, title, body, data);
  }

  /**
   * Send multiple notifications (batch)
   * @param {Array} notifications - Array of notification objects
   */
  async sendBatchNotifications(notifications) {
    const results = [];
    
    for (const notification of notifications) {
      const result = await this.sendNotificationToUser(
        notification.fcmToken,
        notification.title,
        notification.body,
        notification.data
      );
      results.push({
        ...result,
        userId: notification.userId,
        fcmToken: notification.fcmToken,
      });
    }
    
    return results;
  }

  /**
   * Validate FCM token
   * @param {string} fcmToken - FCM token to validate
   */
  async validateFCMToken(fcmToken) {
    try {
      // Simple validation - check if token format looks correct
      if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.length < 50) {
        return { valid: false, error: 'Invalid token format' };
      }

      // For now, assume token is valid if it has the right format
      // We'll validate it when we actually try to send a notification
      return { valid: true };
    } catch (error) {
      console.error('FCM token validation failed:', error);
      return { valid: false, error: error.message };
    }
  }
}

// Export both the class and a singleton instance
module.exports = NotificationService;
module.exports.instance = new NotificationService();
