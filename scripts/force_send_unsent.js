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

async function forceSendUnsent() {
  console.log('🔔 Force sending ALL unsent notifications (including recent ones)...\n');

  const dbConnected = await connectToDatabase();
  if (!dbConnected) return;

  try {
    // Find ALL notifications with isSent: false, regardless of when they were created
    const unsentNotifications = await Notification.find({ 
      isSent: false
    }).sort({ createdAt: 1 });

    console.log(`📋 Found ${unsentNotifications.length} unsent notifications:`);
    
    if (unsentNotifications.length === 0) {
      console.log('ℹ️ No unsent notifications found.');
      return;
    }

    unsentNotifications.forEach((notif, index) => {
      console.log(`   ${index + 1}. "${notif.title}" (${notif.createdAt.toLocaleString()})`);
      console.log(`      📷 Image: ${notif.image || 'none'}`);
      console.log(`      🔔 AutoSend: ${notif.autoSendPush}`);
    });

    console.log('\n🚀 Sending push notifications for all unsent notifications...\n');

    let totalSent = 0;
    let totalFailed = 0;

    for (const notification of unsentNotifications) {
      console.log(`📤 Processing: "${notification.title}"`);
      
      try {
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
          console.log(`✅ Sent successfully! (${result.sent} delivered, ${result.failed} failed)`);
        } else {
          console.log(`❌ No notifications sent (${result.failed} failed)`);
        }

        totalSent += result.sent;
        totalFailed += result.failed;
      } catch (error) {
        console.error(`💥 Error processing notification: ${error.message}`);
        totalFailed++;
      }
      
      console.log('');
    }

    console.log(`📊 FINAL RESULTS:`);
    console.log(`   ✅ Total push notifications sent: ${totalSent}`);
    console.log(`   ❌ Total failed: ${totalFailed}`);
    console.log(`   📱 Notifications processed: ${unsentNotifications.length}`);

    if (totalSent > 0) {
      console.log(`\n🎉 SUCCESS! Check your mobile device for notifications!`);
      console.log(`🎯 Each notification should have "Open" and "Dismiss" action buttons`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

forceSendUnsent().catch(console.error);
