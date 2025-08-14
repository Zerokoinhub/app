#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Notification = require('../src/models/Notification');

async function checkDbState() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Get the exact same query the AutoNotificationService uses
    const unsentQuery = { 
      isSent: false,
      autoSendPush: { $ne: false }
    };
    
    console.log('🔍 Using AutoNotificationService query:', JSON.stringify(unsentQuery, null, 2));
    
    const unsent = await Notification.find(unsentQuery).sort({ createdAt: 1 });
    console.log(`📊 Found ${unsent.length} unsent notifications with this query`);
    
    // Also check basic unsent
    const basicUnsent = await Notification.find({ isSent: false });
    console.log(`📊 Found ${basicUnsent.length} notifications with just isSent: false`);
    
    if (basicUnsent.length > 0) {
      console.log('\n📋 All unsent notifications:');
      basicUnsent.forEach((notif, i) => {
        console.log(`${i+1}. "${notif.title}"`);
        console.log(`   isSent: ${notif.isSent}`);
        console.log(`   autoSendPush: ${notif.autoSendPush}`);
        console.log(`   createdAt: ${notif.createdAt}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkDbState();
