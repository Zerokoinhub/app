const User = require('../models/User');
const NotificationService = require('../services/notificationService');

/**
 * Send push notifications for a given notification document
 * @param {Object} notificationDoc - The notification document from database
 * @returns {Object} Results of push notification sending
 */
async function sendPushNotificationsForNotification(notificationDoc) {
  try {
    console.log(`🔔 Sending push notifications for: "${notificationDoc.title}"`);
    
    // Get all users with FCM tokens
    const users = await User.find({
      fcmTokens: { $exists: true, $ne: [] },
      'notificationSettings.pushEnabled': { $ne: false }
    });

    if (users.length === 0) {
      console.log('⚠️ No users with FCM tokens found');
      return { sent: 0, failed: 0, totalUsers: 0, invalidTokensRemoved: 0 };
    }

    console.log(`📱 Found ${users.length} users with FCM tokens`);

    const notificationService = new NotificationService();
    let successCount = 0;
    let failureCount = 0;
    let invalidTokens = [];

    // Send notifications to each user
    for (const user of users) {
      const activeTokens = user.fcmTokens.filter(token => token.isActive);
      
      for (const tokenData of activeTokens) {
        try {
          const result = await notificationService.sendNotificationToUser(
            tokenData.token,
            notificationDoc.title,
            notificationDoc.content || notificationDoc.message,
            {
              type: notificationDoc.type || 'general',
              image: notificationDoc.imageUrl || notificationDoc.image,
              link: notificationDoc.link || '',
              notificationId: notificationDoc._id.toString(),
              priority: notificationDoc.priority || 'normal',
              // Enable action buttons
              action_open: 'true',
              action_dismiss: 'true'
            }
          );

          if (result.success) {
            successCount++;
            console.log(`✅ Push sent to user ${user.firebaseUid || user.inviteCode} (${tokenData.platform || 'unknown'})`);
          } else {
            failureCount++;
            if (result.shouldRemoveToken) {
              invalidTokens.push({ userId: user._id, token: tokenData.token });
            }
            console.warn(`❌ Failed to send to user ${user.firebaseUid || user.inviteCode}: ${result.error}`);
          }
        } catch (error) {
          failureCount++;
          console.error(`💥 Error sending to token: ${error.message}`);
        }
      }
    }

    // Clean up invalid tokens
    if (invalidTokens.length > 0) {
      for (const { userId, token } of invalidTokens) {
        await User.updateOne(
          { _id: userId },
          { $pull: { fcmTokens: { token: token } } }
        );
      }
      console.log(`🗑️ Removed ${invalidTokens.length} invalid FCM tokens`);
    }

    const results = {
      sent: successCount,
      failed: failureCount,
      totalUsers: users.length,
      invalidTokensRemoved: invalidTokens.length
    };

    console.log(`📊 Push notification summary: ${successCount} sent, ${failureCount} failed`);
    return results;

  } catch (error) {
    console.error('❌ Error sending push notifications:', error);
    return { error: error.message, sent: 0, failed: 0, totalUsers: 0, invalidTokensRemoved: 0 };
  }
}

/**
 * Send push notifications for all unsent notifications in database
 * @returns {Object} Results of push notification sending
 */
async function sendPushNotificationsForUnsentNotifications() {
  try {
    const Notification = require('../models/Notification');
    
    // Find all notifications that haven't been sent yet
    const unsentNotifications = await Notification.find({ 
      isSent: false,
      autoSendPush: { $ne: false } // Include notifications where autoSendPush is not explicitly false
    });

    if (unsentNotifications.length === 0) {
      console.log('✅ No unsent notifications found');
      return { totalNotifications: 0, results: [] };
    }

    console.log(`📋 Found ${unsentNotifications.length} unsent notifications`);

    const allResults = [];

    for (const notification of unsentNotifications) {
      console.log(`\n🔄 Processing notification: "${notification.title}"`);
      
      const result = await sendPushNotificationsForNotification(notification);
      
      // Mark as sent if we successfully sent any push notifications
      if (result.sent > 0) {
        await Notification.updateOne(
          { _id: notification._id },
          { 
            $set: { 
              isSent: true, 
              sentAt: new Date() 
            }
          }
        );
        console.log(`✅ Marked notification "${notification.title}" as sent`);
      }

      allResults.push({
        notificationId: notification._id,
        title: notification.title,
        ...result
      });
    }

    return {
      totalNotifications: unsentNotifications.length,
      results: allResults
    };

  } catch (error) {
    console.error('❌ Error processing unsent notifications:', error);
    return { error: error.message, totalNotifications: 0, results: [] };
  }
}

module.exports = {
  sendPushNotificationsForNotification,
  sendPushNotificationsForUnsentNotifications
};
