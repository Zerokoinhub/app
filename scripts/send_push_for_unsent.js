#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { sendPushNotificationsForUnsentNotifications } = require('../src/utils/notificationHelper');

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

async function main() {
  console.log('🚀 Sending push notifications for all unsent notifications...\n');

  const dbConnected = await connectToDatabase();
  if (!dbConnected) return;

  try {
    const results = await sendPushNotificationsForUnsentNotifications();

    console.log(`\n📊 FINAL RESULTS:`);
    console.log(`   📋 Total notifications processed: ${results.totalNotifications}`);
    
    if (results.results && results.results.length > 0) {
      let totalSent = 0;
      let totalFailed = 0;
      
      console.log(`\n📱 Notification Details:`);
      results.results.forEach((result, index) => {
        console.log(`   ${index + 1}. "${result.title}"`);
        console.log(`      ✅ Sent: ${result.sent}, ❌ Failed: ${result.failed}`);
        totalSent += result.sent;
        totalFailed += result.failed;
      });
      
      console.log(`\n🎯 Summary:`);
      console.log(`   ✅ Total push notifications sent: ${totalSent}`);
      console.log(`   ❌ Total failed: ${totalFailed}`);
      
      if (totalSent > 0) {
        console.log(`\n🎉 SUCCESS! Check your mobile devices for notifications with action buttons!`);
        console.log(`📱 Each notification should have "Open" and "Dismiss" buttons`);
      }
    } else {
      console.log(`   ℹ️ No notifications needed to be processed`);
    }

    if (results.error) {
      console.log(`   ❌ Error: ${results.error}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

main().catch(console.error);
