#!/usr/bin/env node

/**
 * Simple script to send push notification with Instagram pic
 * Usage: node scripts/send_instagram_notification.js [FCM_TOKEN]
 */

require('dotenv').config();
const NotificationService = require('../src/services/notificationService');
const mongoose = require('mongoose');

// Instagram-style image URL (you can replace this with any image URL)
const INSTAGRAM_IMAGE_URL = 'https://images.unsplash.com/photo-1611262588024-d12430b98920?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';

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
    console.log('✅ Notification saved to database:', notification._id);
    return notification;
  } catch (error) {
    console.error('❌ Error saving notification to database:', error.message);
    return null;
  }
}

// Alternative Instagram-style images you can use:
// const INSTAGRAM_IMAGE_URL = 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'; // Social media style
// const INSTAGRAM_IMAGE_URL = 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'; // Phone with social media

async function sendInstagramNotification(fcmToken, saveToDatabase = true) {
  try {
    console.log('🚀 Sending Instagram-style push notification...');
    console.log('📱 FCM Token:', fcmToken ? fcmToken.substring(0, 20) + '...' : 'Not provided');
    console.log('🖼️ Image URL:', INSTAGRAM_IMAGE_URL);

    const notificationService = new NotificationService();

    const title = 'Like Post';
    const body = 'Like our new post and get 5 zerokoin';
    const data = {
      type: 'instagram_like',
      image: INSTAGRAM_IMAGE_URL,
      reward: '5',
      action: 'like_post'
    };

    // Step 1: Send push notification
    const result = await notificationService.sendNotificationToUser(
      fcmToken,
      title,
      body,
      data
    );

    // Step 2: Save to database (so it appears in app's notification list)
    let dbNotification = null;
    if (saveToDatabase) {
      console.log('💾 Saving notification to database...');
      dbNotification = await createNotificationInDatabase(title, body, INSTAGRAM_IMAGE_URL);
    }

    if (result.success) {
      console.log('✅ Instagram notification sent successfully!');
      console.log('📨 Message ID:', result.messageId);
      if (dbNotification) {
        console.log('💾 Database ID:', dbNotification._id);
      }
      console.log('🎯 Notification Details:');
      console.log('   Title:', title);
      console.log('   Body:', body);
      console.log('   Image:', INSTAGRAM_IMAGE_URL);
      console.log('   Reward: 5 zerokoin');
      console.log('   Saved to DB:', saveToDatabase ? '✅' : '❌');
    } else {
      console.error('❌ Failed to send notification:', result.error);

      if (result.shouldRemoveToken) {
        console.log('🗑️ Token should be removed from database (invalid/expired)');
      }
    }

    return {
      ...result,
      dbNotification: dbNotification ? dbNotification._id : null
    };
  } catch (error) {
    console.error('💥 Error in sendInstagramNotification:', error);
    return { success: false, error: error.message };
  }
}

// Main execution
async function main() {
  const fcmToken = process.argv[2];

  if (!fcmToken) {
    console.log('📋 Usage: node scripts/send_instagram_notification.js <FCM_TOKEN>');
    console.log('');
    console.log('Example:');
    console.log('node scripts/send_instagram_notification.js "dGhpc19pc19hX3Rlc3RfdG9rZW4..."');
    console.log('');
    console.log('💡 You can get FCM tokens from your app users or use a test token');
    process.exit(1);
  }

  // Connect to database
  const dbConnected = await connectToDatabase();

  try {
    await sendInstagramNotification(fcmToken, dbConnected);
  } finally {
    if (dbConnected) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Export for use in other scripts
module.exports = { sendInstagramNotification, INSTAGRAM_IMAGE_URL };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
