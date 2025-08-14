#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Notification = require('../src/models/Notification');

async function testMiddleware() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🧪 Testing if post-save middleware works...');
    
    // Create a notification directly with Mongoose (this should trigger the middleware)
    const testNotification = new Notification({
      title: '🧪 Middleware Test',
      message: 'Testing if automatic push notifications work!',
      content: 'Testing if automatic push notifications work!',
      image: 'https://example.com/test.png',
      type: 'general',
      priority: 'normal',
      isSent: false,
      autoSendPush: true
    });

    console.log('📝 Saving notification to database...');
    console.log('📱 If middleware works, you should see automatic push notification logs in the server console.');
    
    await testNotification.save();
    
    console.log(`✅ Notification saved with ID: ${testNotification._id}`);
    console.log('⏰ Check server logs for automatic push notification activity...');
    
    // Wait a moment then check if it was marked as sent
    setTimeout(async () => {
      const updated = await Notification.findById(testNotification._id);
      if (updated.isSent) {
        console.log('✅ SUCCESS: Notification was automatically marked as sent!');
      } else {
        console.log('❌ ISSUE: Notification was not marked as sent by middleware');
      }
      await mongoose.disconnect();
    }, 3000);
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

testMiddleware();
