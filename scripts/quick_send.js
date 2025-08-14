#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Notification = require('../src/models/Notification');
const { sendPushNotificationsForNotification } = require('../src/utils/notificationHelper');

async function quickSend() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find the most recent unsent notification
    const recentUnsent = await Notification.findOne({ 
      isSent: false 
    }).sort({ createdAt: -1 });

    if (!recentUnsent) {
      console.log('No unsent notifications found');
      return;
    }

    console.log(`Sending: "${recentUnsent.title}"`);
    
    const result = await sendPushNotificationsForNotification(recentUnsent);
    
    if (result.sent > 0) {
      await Notification.updateOne(
        { _id: recentUnsent._id },
        { isSent: true, sentAt: new Date() }
      );
      console.log(`✅ Sent to ${result.sent} devices with action buttons!`);
    } else {
      console.log('❌ Failed to send');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

quickSend();
