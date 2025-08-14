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

async function debugNotifications() {
  console.log('🔍 Debugging notification detection...\n');

  const dbConnected = await connectToDatabase();
  if (!dbConnected) return;

  try {
    // Check all recent notifications
    const allNotifications = await Notification.find({}).sort({ createdAt: -1 }).limit(10);
    
    console.log(`📋 Total notifications in database: ${allNotifications.length}`);
    console.log('='.repeat(80));
    
    allNotifications.forEach((notif, index) => {
      console.log(`${index + 1}. "${notif.title}"`);
      console.log(`   📅 Created: ${notif.createdAt.toLocaleString()}`);
      console.log(`   🆔 ID: ${notif._id}`);
      console.log(`   ✅ isSent: ${notif.isSent}`);
      console.log(`   🔔 autoSendPush: ${notif.autoSendPush}`);
      console.log(`   📷 image: ${notif.image || 'undefined'}`);
      console.log(`   📝 content: ${notif.content || 'undefined'}`);
      console.log(`   📰 message: ${notif.message || 'undefined'}`);
      if (notif.sentAt) {
        console.log(`   📤 sentAt: ${notif.sentAt.toLocaleString()}`);
      }
      console.log('');
    });

    // Find unsent notifications (same query as AutoNotificationService)
    const unsentNotifications = await Notification.find({ 
      isSent: false, 
      autoSendPush: true 
    }).sort({ createdAt: 1 });

    console.log(`🔍 Unsent notifications query result: ${unsentNotifications.length} found`);
    
    if (unsentNotifications.length > 0) {
      console.log('\n📤 Unsent notifications:');
      unsentNotifications.forEach((notif, index) => {
        console.log(`   ${index + 1}. "${notif.title}" (ID: ${notif._id})`);
      });
    } else {
      console.log('\n❌ No unsent notifications found with query: { isSent: false, autoSendPush: true }');
    }

    // Check for any notifications with isSent: false regardless of autoSendPush
    const anyUnsent = await Notification.find({ isSent: false });
    console.log(`\n🔍 ANY unsent notifications (isSent: false): ${anyUnsent.length} found`);
    
    if (anyUnsent.length > 0) {
      anyUnsent.forEach((notif, index) => {
        console.log(`   ${index + 1}. "${notif.title}" - autoSendPush: ${notif.autoSendPush}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

debugNotifications().catch(console.error);
