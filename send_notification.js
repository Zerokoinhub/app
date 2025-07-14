#!/usr/bin/env node

/**
 * Script to send push notifications to all users
 * Usage: node send_notification.js
 */

const mongoose = require('mongoose');
const User = require('./src/models/User');
const Notification = require('./src/models/Notification');
const NotificationService = require('./src/services/notificationService');

// MongoDB connection string
const MONGODB_URI = 'mongodb+srv://mstorsulam786:1nkSX6KEOBmdx0ox@cluster0.frhaken.mongodb.net/zero_koin';

// Facebook logo URL (using a public Facebook logo image)
const FACEBOOK_IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/1024px-Facebook_Logo_%282019%29.png';

// Notification details
const NOTIFICATION_TITLE = 'New Post';
const NOTIFICATION_DESCRIPTION = 'Like our new post and get 10 zerokoin';

async function sendNotificationToAllUsers() {
  let connection;
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    connection = await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');
    
    // Initialize notification service
    const notificationService = new NotificationService();
    
    // First, create the notification record in the database
    console.log('📝 Creating notification record...');
    const notificationRecord = new Notification({
      image: FACEBOOK_IMAGE_URL,
      title: NOTIFICATION_TITLE,
      content: NOTIFICATION_DESCRIPTION,
      isSent: false
    });
    
    await notificationRecord.save();
    console.log(`✅ Notification record created with ID: ${notificationRecord._id}`);
    
    // Find all users with active FCM tokens and push notifications enabled
    console.log('🔍 Finding users with FCM tokens...');
    const usersWithTokens = await User.find({
      'fcmTokens': { 
        $exists: true, 
        $not: { $size: 0 } 
      },
      'notificationSettings.pushEnabled': { $ne: false }
    }).select('firebaseUid email fcmTokens notificationSettings');
    
    console.log(`📊 Found ${usersWithTokens.length} users with FCM tokens`);
    
    if (usersWithTokens.length === 0) {
      console.log('⚠️ No users found with FCM tokens. Exiting...');
      return;
    }
    
    // Prepare notifications array
    const notifications = [];
    let totalTokens = 0;
    
    for (const user of usersWithTokens) {
      // Get active FCM tokens
      const activeTokens = user.fcmTokens.filter(token => token.isActive);
      
      if (activeTokens.length === 0) {
        console.log(`⚠️ User ${user.email || user.firebaseUid} has no active FCM tokens`);
        continue;
      }
      
      // Add notification for each active token
      for (const tokenData of activeTokens) {
        notifications.push({
          userId: user.firebaseUid,
          fcmToken: tokenData.token,
          title: NOTIFICATION_TITLE,
          body: NOTIFICATION_DESCRIPTION,
          data: {
            type: 'promotional',
            notificationId: notificationRecord._id.toString(),
            image: FACEBOOK_IMAGE_URL
          }
        });
        totalTokens++;
      }
    }
    
    console.log(`📱 Prepared ${notifications.length} notifications for ${totalTokens} tokens`);
    
    // Confirm before sending
    console.log('\n⚠️  Ready to send notifications!');
    console.log(`Title: ${NOTIFICATION_TITLE}`);
    console.log(`Description: ${NOTIFICATION_DESCRIPTION}`);
    console.log(`Image: ${FACEBOOK_IMAGE_URL}`);
    console.log(`Total recipients: ${notifications.length}`);
    console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n🚀 Sending notifications...');
    
    // Send notifications in batches to avoid overwhelming the service
    const batchSize = 10;
    let successCount = 0;
    let failureCount = 0;
    let invalidTokens = [];
    
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(notifications.length / batchSize)}`);
      
      // Process batch
      for (const notification of batch) {
        try {
          const result = await notificationService.sendNotificationToUser(
            notification.fcmToken,
            notification.title,
            notification.body,
            notification.data
          );
          
          if (result.success) {
            successCount++;
            console.log(`✅ Sent to user ${notification.userId}`);
          } else {
            failureCount++;
            console.log(`❌ Failed to send to user ${notification.userId}: ${result.error}`);
            
            if (result.shouldRemoveToken) {
              invalidTokens.push({
                userId: notification.userId,
                token: notification.fcmToken
              });
            }
          }
        } catch (error) {
          failureCount++;
          console.error(`❌ Error sending to user ${notification.userId}:`, error.message);
        }
      }
      
      // Small delay between batches
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Clean up invalid tokens
    if (invalidTokens.length > 0) {
      console.log(`\n🗑️ Cleaning up ${invalidTokens.length} invalid tokens...`);
      
      for (const invalidToken of invalidTokens) {
        try {
          await User.updateOne(
            { firebaseUid: invalidToken.userId },
            { $pull: { fcmTokens: { token: invalidToken.token } } }
          );
        } catch (error) {
          console.error(`Error removing invalid token for user ${invalidToken.userId}:`, error.message);
        }
      }
      
      console.log('✅ Invalid tokens cleaned up');
    }
    
    // Mark notification as sent
    notificationRecord.isSent = true;
    notificationRecord.sentAt = new Date();
    await notificationRecord.save();
    
    // Final summary
    console.log('\n🎉 Notification sending completed!');
    console.log(`✅ Successfully sent: ${successCount}`);
    console.log(`❌ Failed to send: ${failureCount}`);
    console.log(`🗑️ Invalid tokens removed: ${invalidTokens.length}`);
    console.log(`📝 Notification record marked as sent: ${notificationRecord._id}`);
    
  } catch (error) {
    console.error('❌ Error sending notifications:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Add command line argument parsing for different notification types
const args = process.argv.slice(2);

async function main() {
  console.log('🔔 ZeroKoin Notification Sender');
  console.log('================================');
  console.log(`Title: ${NOTIFICATION_TITLE}`);
  console.log(`Description: ${NOTIFICATION_DESCRIPTION}`);
  console.log(`Image: Facebook Logo`);
  console.log('');
  
  await sendNotificationToAllUsers();
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { sendNotificationToAllUsers };
