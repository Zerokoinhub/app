#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Notification = require('../src/models/Notification');
const User = require('../src/models/User');
const NotificationService = require('../src/services/notificationService');

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    return false;
  }
}

async function testDatabaseToPushFlow() {
  console.log('🧪 Testing: Database notification → Push notification flow...\n');

  const dbConnected = await connectToDatabase();
  if (!dbConnected) return;

  try {
    // Step 1: Check existing notifications
    console.log('1️⃣ Checking existing notifications in database...');
    const notifications = await Notification.find({}).sort({ createdAt: -1 }).limit(3);
    console.log(`   Found ${notifications.length} notifications in database`);
    
    if (notifications.length > 0) {
      console.log('   Recent notifications:');
      notifications.forEach((notif, index) => {
        console.log(`   ${index + 1}. "${notif.title}" - Sent: ${notif.isSent ? '✅' : '❌'}`);
      });
    }

    // Step 2: Check users with FCM tokens
    console.log('\n2️⃣ Checking users with FCM tokens...');
    const users = await User.find({
      fcmTokens: { $exists: true, $ne: [] },
      'notificationSettings.pushEnabled': { $ne: false }
    });
    console.log(`   Found ${users.length} users with FCM tokens`);

    if (users.length === 0) {
      console.log('❌ No users with FCM tokens found. Push notifications cannot be sent.');
      return;
    }

    // Step 3: Create a test notification in database
    console.log('\n3️⃣ Creating test notification in database...');
    const testNotification = new Notification({
      image: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      imageUrl: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      title: 'Test Database → Push Flow',
      content: 'This notification was added to database and should trigger push notifications with action buttons!',
      message: 'This notification was added to database and should trigger push notifications with action buttons!',
      link: '',
      type: 'general',
      priority: 'high',
      isSent: false
    });

    await testNotification.save();
    console.log(`   ✅ Test notification created with ID: ${testNotification._id}`);

    // Step 4: Now manually send push notifications for this database notification
    console.log('\n4️⃣ Sending push notifications for the database notification...');
    
    const notificationService = new NotificationService();
    let successCount = 0;
    let failureCount = 0;
    let invalidTokens = [];

    for (const user of users) {
      const activeTokens = user.fcmTokens.filter(token => token.isActive);
      
      for (const tokenData of activeTokens) {
        try {
          const result = await notificationService.sendNotificationToUser(
            tokenData.token,
            testNotification.title,
            testNotification.content,
            {
              type: testNotification.type,
              image: testNotification.imageUrl,
              link: testNotification.link,
              notificationId: testNotification._id.toString(),
              priority: testNotification.priority,
              // These enable action buttons
              action_open: 'true',
              action_dismiss: 'true'
            }
          );

          if (result.success) {
            successCount++;
            console.log(`   ✅ Push sent to user ${user.firebaseUid || user.inviteCode} (${tokenData.platform || 'unknown'})`);
          } else {
            failureCount++;
            if (result.shouldRemoveToken) {
              invalidTokens.push({ userId: user._id, token: tokenData.token });
            }
            console.warn(`   ❌ Failed to send to user ${user.firebaseUid || user.inviteCode}: ${result.error}`);
          }
        } catch (error) {
          failureCount++;
          console.error(`   💥 Error sending to token: ${error.message}`);
        }
      }
    }

    // Step 5: Update database notification as sent
    if (successCount > 0) {
      testNotification.isSent = true;
      testNotification.sentAt = new Date();
      await testNotification.save();
      console.log(`   ✅ Database notification marked as sent`);
    }

    // Clean up invalid tokens
    if (invalidTokens.length > 0) {
      for (const { userId, token } of invalidTokens) {
        await User.updateOne(
          { _id: userId },
          { $pull: { fcmTokens: { token: token } } }
        );
      }
      console.log(`   🗑️ Removed ${invalidTokens.length} invalid FCM tokens`);
    }

    console.log(`\n📊 Test Results:`);
    console.log(`   ✅ Push notifications sent: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log(`   📱 Total users: ${users.length}`);
    console.log(`   🗑️ Invalid tokens removed: ${invalidTokens.length}`);

    if (successCount > 0) {
      console.log(`\n🎯 Check your mobile device!`);
      console.log(`   📱 You should see a notification with "Open" and "Dismiss" buttons`);
      console.log(`   🔍 Test the action buttons:`);
      console.log(`      • Tap "Open" → Should open your app`);
      console.log(`      • Tap "Dismiss" → Should dismiss the notification`);
      console.log(`      • Tap notification body → Should also open your app`);
    } else {
      console.log(`\n⚠️  No push notifications were sent successfully.`);
      console.log(`   Check if your FCM tokens are valid and devices are reachable.`);
    }

  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

testDatabaseToPushFlow().catch(console.error);
