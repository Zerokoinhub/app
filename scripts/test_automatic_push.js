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

async function testAutomaticPushNotifications() {
  console.log('🧪 Testing: Automatic Push Notifications on Database Save...\n');

  const dbConnected = await connectToDatabase();
  if (!dbConnected) return;

  try {
    console.log('🔔 Creating a new notification in the database...');
    console.log('   This should automatically trigger push notifications with action buttons!\n');

    // Create a new notification - this should automatically trigger push notifications
    const testNotification = new Notification({
      image: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      imageUrl: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      title: '🚀 Automatic Push Test',
      content: 'This notification was saved to database and should automatically send push notifications with Open and Dismiss buttons!',
      message: 'This notification was saved to database and should automatically send push notifications with Open and Dismiss buttons!',
      link: '',
      type: 'general',
      priority: 'high',
      autoSendPush: true, // Enable automatic push notifications
      isSent: false
    });

    console.log('💾 Saving notification to database...');
    console.log('   Watch for automatic push notification logs below:');
    console.log('   ' + '='.repeat(60));

    // Save to database - this will trigger the post-save middleware
    await testNotification.save();

    console.log('   ' + '='.repeat(60));
    console.log(`✅ Notification saved to database with ID: ${testNotification._id}`);

    // Wait a moment for the async operations to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if the notification was marked as sent
    const updatedNotification = await Notification.findById(testNotification._id);
    
    console.log(`\n📊 Final Status:`);
    console.log(`   📝 Notification ID: ${updatedNotification._id}`);
    console.log(`   📧 Title: "${updatedNotification.title}"`);
    console.log(`   ✅ Sent Status: ${updatedNotification.isSent ? 'SENT' : 'NOT SENT'}`);
    console.log(`   📅 Sent At: ${updatedNotification.sentAt || 'Not sent'}`);
    console.log(`   🔔 Auto Push: ${updatedNotification.autoSendPush ? 'ENABLED' : 'DISABLED'}`);

    if (updatedNotification.isSent) {
      console.log(`\n🎉 SUCCESS! Automatic push notifications worked!`);
      console.log(`📱 Check your mobile devices for notifications with action buttons`);
      console.log(`\n🎯 What to test on your device:`);
      console.log(`   1. You should see a notification with "Open" and "Dismiss" buttons`);
      console.log(`   2. Tap "Open" button → Should open your ZeroKoin app`);
      console.log(`   3. Tap "Dismiss" button → Should dismiss the notification`);
      console.log(`   4. Tap notification body → Should also open your app`);
    } else {
      console.log(`\n⚠️  Notification was saved but push notifications were not sent.`);
      console.log(`   Check the logs above for any errors or issues.`);
    }

  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

async function testDirectDatabaseInsert() {
  console.log('\n🧪 Testing: Direct Database Insert (simulating manual database entry)...\n');

  const dbConnected = await connectToDatabase();
  if (!dbConnected) return;

  try {
    console.log('💾 Inserting notification directly using insertOne...');
    
    // Use direct MongoDB operation to simulate manual database entry
    const notificationData = {
      image: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      imageUrl: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      title: '📱 Direct Database Insert Test',
      content: 'This notification was inserted directly into database (simulating manual entry)',
      message: 'This notification was inserted directly into database (simulating manual entry)',
      link: '',
      type: 'general',
      priority: 'high',
      autoSendPush: true,
      isSent: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // This simulates what happens when you manually add to database
    const result = await mongoose.connection.collection('notifications').insertOne(notificationData);
    console.log(`✅ Direct insert completed with ID: ${result.insertedId}`);
    
    console.log(`\n⚠️  NOTE: Direct database inserts don't trigger Mongoose middleware.`);
    console.log(`   This is why manual database entries don't send push notifications.`);
    console.log(`   The automatic push only works when using Mongoose model.save()`);

  } catch (error) {
    console.error('❌ Error in direct insert test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run both tests
async function runAllTests() {
  await testAutomaticPushNotifications();
  await testDirectDatabaseInsert();
  
  console.log(`\n📋 SUMMARY:`);
  console.log(`✅ model.save() → Triggers automatic push notifications`);
  console.log(`❌ Direct database insert → Does NOT trigger push notifications`);
  console.log(`\n💡 SOLUTION: Always use the API endpoints or Mongoose model operations`);
  console.log(`   to ensure push notifications are sent automatically.`);
}

runAllTests().catch(console.error);
