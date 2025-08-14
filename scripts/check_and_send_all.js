#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Notification = require('../src/models/Notification');
const { sendPushNotificationsForNotification } = require('../src/utils/notificationHelper');

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

async function checkAndSendAll() {
  console.log('🔍 Checking all recent notifications and sending push notifications...\n');

  const dbConnected = await connectToDatabase();
  if (!dbConnected) return;

  try {
    // Get the most recent 5 notifications
    const recentNotifications = await Notification.find({})
      .sort({ createdAt: -1 })
      .limit(5);

    console.log(`📋 Found ${recentNotifications.length} recent notifications:`);
    console.log('='.repeat(60));

    recentNotifications.forEach((notif, index) => {
      console.log(`${index + 1}. "${notif.title}"`);
      console.log(`   📅 Created: ${notif.createdAt.toLocaleString()}`);
      console.log(`   ✅ Sent: ${notif.isSent ? 'YES' : 'NO'}`);
      console.log(`   🔔 Auto Push: ${notif.autoSendPush !== false ? 'ENABLED' : 'DISABLED'}`);
      if (notif.sentAt) {
        console.log(`   📤 Sent At: ${notif.sentAt.toLocaleString()}`);
      }
      console.log('');
    });

    // Find any that need push notifications
    const needsPush = recentNotifications.filter(notif => 
      !notif.isSent && notif.autoSendPush !== false
    );

    if (needsPush.length === 0) {
      console.log('ℹ️ All recent notifications have already been sent or have auto-push disabled.');
      
      // Check if the "testing" notification exists and offer to resend
      const testingNotif = recentNotifications.find(notif => 
        notif.title.toLowerCase().includes('testing') || 
        notif.title.toLowerCase().includes('test')
      );

      if (testingNotif) {
        console.log(`\n🔔 Found your "testing" notification. Sending push notifications for it...`);
        
        const result = await sendPushNotificationsForNotification(testingNotif);
        
        if (result.sent > 0) {
          console.log(`✅ Push notifications sent successfully!`);
          console.log(`   📤 Sent: ${result.sent}, ❌ Failed: ${result.failed}`);
          console.log(`\n🎉 Check your mobile device for notifications with action buttons!`);
        } else {
          console.log(`❌ No push notifications were sent. Check if users have valid FCM tokens.`);
        }
      }
    } else {
      console.log(`🚀 Sending push notifications for ${needsPush.length} unsent notifications...\n`);

      let totalSent = 0;
      let totalFailed = 0;

      for (const notification of needsPush) {
        console.log(`📤 Processing: "${notification.title}"`);
        
        const result = await sendPushNotificationsForNotification(notification);
        
        if (result.sent > 0) {
          // Mark as sent
          await Notification.updateOne(
            { _id: notification._id },
            { 
              $set: { 
                isSent: true, 
                sentAt: new Date() 
              }
            }
          );
          console.log(`✅ Sent and marked as complete (${result.sent} delivered)\n`);
        } else {
          console.log(`❌ No notifications sent\n`);
        }

        totalSent += result.sent;
        totalFailed += result.failed;
      }

      console.log(`📊 RESULTS:`);
      console.log(`   ✅ Total sent: ${totalSent}`);
      console.log(`   ❌ Total failed: ${totalFailed}`);

      if (totalSent > 0) {
        console.log(`\n🎉 SUCCESS! Check your mobile devices for notifications with action buttons!`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

checkAndSendAll().catch(console.error);
