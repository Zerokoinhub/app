#!/usr/bin/env node

/**
 * Advanced script to send Instagram-style notifications to multiple users
 * Usage: node scripts/send_batch_instagram_notifications.js
 */

require('dotenv').config();
const NotificationService = require('../src/services/notificationService');
const mongoose = require('mongoose');

async function createNotificationInDatabase(title, body, imageUrl) {
  try {
    const Notification = require('../src/models/Notification');

    const notification = new Notification({
      image: imageUrl,
      title: title,
      content: body,
      link: null,
      isSent: true,
      sentAt: new Date()
    });

    await notification.save();
    console.log('💾 Notification saved to database:', notification._id);
    return notification;
  } catch (error) {
    console.error('❌ Error saving notification to database:', error.message);
    return null;
  }
}

// Instagram-style images collection
const INSTAGRAM_IMAGES = [
  'https://images.unsplash.com/photo-1611262588024-d12430b98920?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', // Social media post
  'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', // Phone social media
  'https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', // Instagram style
  'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', // Food post
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'  // Lifestyle
];

// Different notification variations
const NOTIFICATION_VARIATIONS = [
  {
    title: 'Like Post',
    body: 'Like our new post and get 5 zerokoin',
    reward: '5'
  },
  {
    title: 'New Post Alert!',
    body: 'Check out our latest post and earn 5 zerokoin',
    reward: '5'
  },
  {
    title: 'ZeroKoin Reward',
    body: 'Like our post to instantly earn 5 zerokoin',
    reward: '5'
  }
];

async function connectToDatabase() {
  try {
    if (!process.env.MONGODB_URI) {
      console.log('⚠️ MONGODB_URI not found in environment variables');
      return false;
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

async function getUsersWithFCMTokens() {
  try {
    // Import the User model
    const User = require('../src/models/User');

    const users = await User.find({
      'fcmTokens.0': { $exists: true },
      'fcmTokens.isActive': true,
      'notificationSettings.pushEnabled': true
    }).select('_id fcmTokens name email inviteCode').limit(10); // Limit to 10 for testing

    // Flatten the users to get individual FCM tokens
    const userTokens = [];
    users.forEach(user => {
      user.fcmTokens.forEach(fcmToken => {
        if (fcmToken.isActive) {
          userTokens.push({
            _id: user._id,
            fcmToken: fcmToken.token,
            name: user.name,
            email: user.email,
            inviteCode: user.inviteCode,
            platform: fcmToken.platform
          });
        }
      });
    });

    console.log(`📱 Found ${userTokens.length} active FCM tokens from ${users.length} users`);
    return userTokens;
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    return [];
  }
}

async function sendBatchInstagramNotifications(users = []) {
  const notificationService = new NotificationService();
  const results = [];
  
  console.log(`🚀 Sending Instagram notifications to ${users.length} users...`);
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    // Pick random image and notification variation
    const randomImage = INSTAGRAM_IMAGES[Math.floor(Math.random() * INSTAGRAM_IMAGES.length)];
    const randomNotification = NOTIFICATION_VARIATIONS[Math.floor(Math.random() * NOTIFICATION_VARIATIONS.length)];
    
    const data = {
      type: 'instagram_like',
      image: randomImage,
      reward: randomNotification.reward,
      action: 'like_post',
      userId: user._id.toString()
    };

    console.log(`📤 Sending to user ${i + 1}/${users.length}: ${user.name || user.email || user.inviteCode || 'Unknown'}`);

    const result = await notificationService.sendNotificationToUser(
      user.fcmToken,
      randomNotification.title,
      randomNotification.body,
      data
    );

    // Save to database only once per unique notification (not per user)
    let dbNotification = null;
    if (i === 0) { // Only save to database for the first user to avoid duplicates
      console.log('💾 Saving notification to database...');
      dbNotification = await createNotificationInDatabase(
        randomNotification.title,
        randomNotification.body,
        randomImage
      );
    }

    results.push({
      userId: user._id,
      username: user.name || user.email || user.inviteCode,
      success: result.success,
      error: result.error,
      messageId: result.messageId,
      dbNotificationId: dbNotification ? dbNotification._id : null
    });

    // Add small delay between notifications
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

async function sendToSpecificTokens(tokens) {
  const notificationService = new NotificationService();
  const results = [];
  
  console.log(`🚀 Sending Instagram notifications to ${tokens.length} specific tokens...`);
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Pick random image and notification variation
    const randomImage = INSTAGRAM_IMAGES[Math.floor(Math.random() * INSTAGRAM_IMAGES.length)];
    const randomNotification = NOTIFICATION_VARIATIONS[Math.floor(Math.random() * NOTIFICATION_VARIATIONS.length)];
    
    const data = {
      type: 'instagram_like',
      image: randomImage,
      reward: randomNotification.reward,
      action: 'like_post'
    };

    console.log(`📤 Sending to token ${i + 1}/${tokens.length}: ${token.substring(0, 20)}...`);
    
    const result = await notificationService.sendNotificationToUser(
      token,
      randomNotification.title,
      randomNotification.body,
      data
    );

    results.push({
      token: token.substring(0, 20) + '...',
      success: result.success,
      error: result.error,
      messageId: result.messageId
    });

    // Add small delay between notifications
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

function printResults(results) {
  console.log('\n📊 Notification Results:');
  console.log('========================');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((successful / results.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed notifications:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`   - ${result.username || result.token}: ${result.error}`);
    });
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Send to specific tokens provided as arguments
    console.log('📱 Sending to specific FCM tokens...');
    const results = await sendToSpecificTokens(args);
    printResults(results);
    return;
  }
  
  // Try to connect to database and send to users
  const dbConnected = await connectToDatabase();
  
  if (dbConnected) {
    try {
      const users = await getUsersWithFCMTokens();
      
      if (users.length === 0) {
        console.log('⚠️ No users found with FCM tokens');
        console.log('💡 You can provide FCM tokens as arguments:');
        console.log('   node scripts/send_batch_instagram_notifications.js "token1" "token2"');
        return;
      }
      
      const results = await sendBatchInstagramNotifications(users);
      printResults(results);
      
    } finally {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
  } else {
    console.log('💡 Usage without database:');
    console.log('   node scripts/send_batch_instagram_notifications.js "token1" "token2" "token3"');
  }
}

// Export for use in other scripts
module.exports = { 
  sendBatchInstagramNotifications, 
  sendToSpecificTokens,
  INSTAGRAM_IMAGES,
  NOTIFICATION_VARIATIONS
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
