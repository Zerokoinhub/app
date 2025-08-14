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

async function sendPushForRecentNotifications() {
  console.log('🔔 Sending push notifications for recent unsent notifications...\n');

  const dbConnected = await connectToDatabase();
  if (!dbConnected) return;

  try {
    // Find recent notifications that haven't been sent (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentUnsent = await Notification.find({ 
      isSent: false,
      createdAt: { $gte: yesterday },
      autoSendPush: { $ne: false }
    }).sort({ createdAt: -1 });

    if (recentUnsent.length === 0) {
      console.log('ℹ️ No recent unsent notifications found in the last 24 hours');
      return;
    }

    console.log(`📱 Found ${recentUnsent.length} recent unsent notifications:`);
    recentUnsent.forEach((notif, index) => {
      console.log(`   ${index + 1}. "${notif.title}" (${notif.createdAt.toLocaleString()})`);
    });

    console.log('\n🚀 Sending push notifications...\n');

    let totalSent = 0;
    let totalFailed = 0;

    for (const notification of recentUnsent) {
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
        console.log(`✅ Marked as sent (${result.sent} delivered, ${result.failed} failed)\n`);
      } else {
        console.log(`❌ No notifications sent (${result.failed} failed)\n`);
      }

      totalSent += result.sent;
      totalFailed += result.failed;
    }

    console.log(`📊 FINAL RESULTS:`);
    console.log(`   ✅ Total push notifications sent: ${totalSent}`);
    console.log(`   ❌ Total failed: ${totalFailed}`);
    console.log(`   📱 Notifications processed: ${recentUnsent.length}`);

    if (totalSent > 0) {
      console.log(`\n🎉 SUCCESS! Check your mobile devices for notifications with action buttons!`);
      console.log(`🎯 Each notification should have "Open" and "Dismiss" buttons`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

sendPushForRecentNotifications().catch(console.error);
