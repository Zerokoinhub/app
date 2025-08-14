const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  image: {
    type: String,
    required: false,
    default: ''
  },
  imageUrl: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    default: ''
  },
  link: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['general', 'promotional', 'update', 'alert'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent', 'new-user'],
    default: 'normal'
  },
  isSent: {
    type: Boolean,
    default: false
  },
  sentAt: {
    type: Date,
    default: null
  },
  autoSendPush: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Post-save middleware to automatically send push notifications
notificationSchema.post('save', async function(doc, next) {
  try {
    console.log('🔔 Post-save middleware triggered for notification:', doc.title);
    console.log('🔍 isNew:', this.isNew, 'isSent:', doc.isSent, 'autoSendPush:', doc.autoSendPush);
    
    // Only send push notifications for new notifications that haven't been sent yet
    if (!doc.isSent && doc.autoSendPush) {
      console.log('🔔 New notification saved to database, triggering automatic push notifications...');
      
      // Use setTimeout to run this asynchronously after the save operation completes
      setTimeout(async () => {
        try {
          // Import here to avoid circular dependencies
          const User = require('./User');
          const NotificationService = require('../services/notificationService');
      
      // Get all users with FCM tokens
      const users = await User.find({
        fcmTokens: { $exists: true, $ne: [] },
        'notificationSettings.pushEnabled': { $ne: false }
      });

      if (users.length === 0) {
        console.log('⚠️ No users with FCM tokens found for automatic push notifications');
        return; // Do not call next() here, as it's in a setTimeout
      }

      console.log(`📱 Found ${users.length} users with FCM tokens for automatic push`);

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
              doc.title,
              doc.content || doc.message,
              {
                type: doc.type || 'general',
                image: doc.imageUrl || doc.image,
                link: doc.link || '',
                notificationId: doc._id.toString(),
                priority: doc.priority || 'normal',
                // Enable action buttons
                action_open: 'true',
                action_dismiss: 'true'
              }
            );

            if (result.success) {
              successCount++;
              console.log(`✅ Auto-push sent to user ${user.firebaseUid || user.inviteCode} (${tokenData.platform || 'unknown'})`);
            } else {
              failureCount++;
              if (result.shouldRemoveToken) {
                invalidTokens.push({ userId: user._id, token: tokenData.token });
              }
            }
          } catch (error) {
            failureCount++;
            console.error(`💥 Error in auto-push to token: ${error.message}`);
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
        console.log(`🗑️ Auto-removed ${invalidTokens.length} invalid FCM tokens`);
      }

          // Mark notification as sent if we successfully sent any
          if (successCount > 0) {
            await mongoose.model('Notification').updateOne(
              { _id: doc._id },
              { 
                $set: { 
                  isSent: true, 
                  sentAt: new Date() 
                }
              }
            );
            console.log(`📊 Auto-push complete: ${successCount} sent, ${failureCount} failed`);
          }
        } catch (asyncError) {
          console.error('❌ Error in async notification processing:', asyncError);
        }
      }, 100); // Small delay to ensure save operation is complete
    }
    
    next();
  } catch (error) {
    console.error('❌ Error in notification post-save middleware:', error);
    next(); // Don't fail the save operation due to push notification errors
  }
});

module.exports = mongoose.model('Notification', notificationSchema); 