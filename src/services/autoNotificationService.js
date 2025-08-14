const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { sendPushNotificationsForNotification } = require('../utils/notificationHelper');

class AutoNotificationService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.checkInterval = 10000; // Check every 10 seconds
  }

  /**
   * Start the automatic notification service
   */
  start() {
    if (this.isRunning) {
      console.log('📱 Auto notification service is already running');
      return;
    }

    console.log('🚀 Starting automatic notification service...');
    this.isRunning = true;

    // Initial check
    this.checkForUnsentNotifications();

    // Set up interval to check periodically
    this.intervalId = setInterval(() => {
      this.checkForUnsentNotifications();
    }, this.checkInterval);

    console.log(`✅ Auto notification service started (checking every ${this.checkInterval/1000} seconds)`);
  }

  /**
   * Stop the automatic notification service
   */
  stop() {
    if (!this.isRunning) {
      console.log('📱 Auto notification service is not running');
      return;
    }

    console.log('🛑 Stopping automatic notification service...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ Auto notification service stopped');
  }

  /**
   * Check for unsent notifications and send push notifications
   */
  async checkForUnsentNotifications() {
    try {
      // Find notifications that haven't been sent yet.
      // Treat missing fields from manual DB inserts as:
      // - isSent: false (unsent)
      // - autoSendPush: true (enabled)
      const unsentNotifications = await Notification.find({
        $and: [
          { $or: [ { isSent: { $exists: false } }, { isSent: false } ] },
          { $or: [ { autoSendPush: { $exists: false } }, { autoSendPush: { $ne: false } } ] }
        ]
      }).sort({ createdAt: 1 }); // Oldest first

      if (unsentNotifications.length === 0) {
        // Only log this occasionally to avoid spam
        if (Math.random() < 0.1) { // 10% chance to log
          console.log('📱 Auto notification service: No unsent notifications found');
        }
        return;
      }

      console.log(`🔔 Auto notification service found ${unsentNotifications.length} unsent notifications`);

      for (const notification of unsentNotifications) {
        try {
          console.log(`📤 Auto-sending push notifications for: "${notification.title}"`);
          
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
            console.log(`✅ Auto-marked notification "${notification.title}" as sent (${result.sent} sent, ${result.failed} failed)`);
          } else {
            console.log(`⚠️ No push notifications sent for "${notification.title}" - will retry later`);
          }

          // Small delay between notifications to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (notificationError) {
          console.error(`❌ Error processing notification "${notification.title}":`, notificationError.message);
        }
      }

    } catch (error) {
      console.error('❌ Error in auto notification service:', error.message);
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
   * Set check interval (in milliseconds)
   */
  setCheckInterval(interval) {
    this.checkInterval = interval;
    
    if (this.isRunning) {
      // Restart with new interval
      this.stop();
      this.start();
    }
    
    console.log(`⚙️ Auto notification service interval set to ${interval/1000} seconds`);
  }
}

// Export singleton instance
module.exports = new AutoNotificationService();
