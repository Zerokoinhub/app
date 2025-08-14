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

async function testAutomaticSystem() {
  console.log('🧪 Testing if automatic push notifications work without scripts...\n');

  const dbConnected = await connectToDatabase();
  if (!dbConnected) return;

  try {
    // Create a new notification directly in the database
    const testNotification = new Notification({
      title: '🔄 Auto Test',
      content: 'This should automatically send push notifications within 10 seconds!',
      message: 'This should automatically send push notifications within 10 seconds!',
      image: 'https://example.com/test.png', // Required field
      type: 'general',
      priority: 'normal',
      isSent: false,
      autoSendPush: true
    });

    console.log('📝 Adding notification directly to database...');
    await testNotification.save();
    console.log(`✅ Notification saved to database with ID: ${testNotification._id}`);
    
    console.log('\n⏰ The AutoNotificationService should detect this notification within 10 seconds and send push notifications automatically.');
    console.log('🔍 Watch your mobile device for a push notification with "Open" and "Dismiss" buttons.');
    console.log('\n💡 If you receive the push notification, the automatic system is working correctly!');
    console.log('❌ If you don\'t receive it within 15 seconds, there might be an issue with the automatic service.');
    
  } catch (error) {
    console.error('❌ Error creating test notification:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

testAutomaticSystem().catch(console.error);
