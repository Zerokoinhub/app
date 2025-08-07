#!/usr/bin/env node

/**
 * Script to check notifications in the database
 * Usage: node scripts/check_notifications.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function connectToDatabase() {
  try {
    if (!process.env.MONGODB_URI) {
      console.log('⚠️ MONGODB_URI not found in environment variables');
      return false;
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

async function checkNotifications() {
  try {
    const Notification = require('../src/models/Notification');
    
    // Get the latest 10 notifications
    const notifications = await Notification.find({})
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log(`📋 Found ${notifications.length} notifications in database:\n`);
    
    notifications.forEach((notification, index) => {
      console.log(`${index + 1}. 📨 ${notification.title}`);
      console.log(`   Content: ${notification.content}`);
      console.log(`   Image: ${notification.image.substring(0, 50)}...`);
      console.log(`   Sent: ${notification.isSent ? '✅' : '❌'}`);
      console.log(`   Created: ${notification.createdAt.toLocaleString()}`);
      if (notification.sentAt) {
        console.log(`   Sent At: ${notification.sentAt.toLocaleString()}`);
      }
      console.log('   ---');
    });
    
    // Check for Instagram notifications specifically
    const instagramNotifications = await Notification.find({
      title: 'Like Post'
    }).sort({ createdAt: -1 });
    
    console.log(`\n🎯 Instagram "Like Post" notifications: ${instagramNotifications.length}`);
    
    if (instagramNotifications.length > 0) {
      const latest = instagramNotifications[0];
      console.log(`   Latest: ${latest.createdAt.toLocaleString()}`);
      console.log(`   Content: "${latest.content}"`);
      console.log(`   Image: ${latest.image}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking notifications:', error.message);
  }
}

async function main() {
  const dbConnected = await connectToDatabase();
  
  if (!dbConnected) {
    console.log('❌ Could not connect to database');
    process.exit(1);
  }
  
  try {
    await checkNotifications();
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkNotifications };
