#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Notification = require('../src/models/Notification');

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

async function testFullyAutomaticNotifications() {
  console.log('🧪 Testing: Fully Automatic Push Notifications...\n');
  console.log('   This test creates a notification and waits for the automatic service');
  console.log('   to detect it and send push notifications without any manual intervention.\n');

  const dbConnected = await connectToDatabase();
  if (!dbConnected) return;

  try {
    console.log('💾 Creating a new notification in the database...');
    
    // Create a new notification - the automatic service should pick this up
    const testNotification = new Notification({
      image: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      imageUrl: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      title: '🔔 Fully Automatic Test',
      content: 'This notification should be automatically detected and sent as push notifications with action buttons!',
      message: 'This notification should be automatically detected and sent as push notifications with action buttons!',
      link: '',
      type: 'general',
      priority: 'high',
      autoSendPush: true, // Enable automatic push notifications
      isSent: false
    });

    await testNotification.save();
    console.log(`✅ Notification saved with ID: ${testNotification._id}`);
    console.log('⏳ Waiting for automatic service to detect and send push notifications...');
    console.log('   (The background service checks every 10 seconds)');

    // Wait and check periodically if the notification was sent
    const maxWaitTime = 60000; // 60 seconds max wait
    const checkInterval = 5000; // Check every 5 seconds
    let waitTime = 0;
    let sent = false;

    while (waitTime < maxWaitTime && !sent) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waitTime += checkInterval;

      // Check if notification was marked as sent
      const updatedNotification = await Notification.findById(testNotification._id);
      if (updatedNotification.isSent) {
        sent = true;
        console.log(`\n🎉 SUCCESS! Notification automatically sent after ${waitTime/1000} seconds!`);
        console.log(`   📅 Sent at: ${updatedNotification.sentAt}`);
        console.log(`   📱 Check your mobile devices for push notifications with action buttons!`);
        
        console.log(`\n🎯 What to verify on your device:`);
        console.log(`   1. You should see a notification with "Open" and "Dismiss" buttons`);
        console.log(`   2. Tap "Open" button → Should open your ZeroKoin app`);
        console.log(`   3. Tap "Dismiss" button → Should dismiss the notification`);
        console.log(`   4. Tap notification body → Should also open your app`);
        break;
      } else {
        console.log(`   ⏳ Still waiting... (${waitTime/1000}s elapsed)`);
      }
    }

    if (!sent) {
      console.log(`\n⚠️  Timeout reached (${maxWaitTime/1000}s). Notification was not automatically sent.`);
      console.log(`   This might mean the automatic service is not running or there's an issue.`);
      console.log(`   Check the main application logs for any errors.`);
    }

  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

testFullyAutomaticNotifications().catch(console.error);
