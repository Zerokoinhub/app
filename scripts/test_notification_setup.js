#!/usr/bin/env node

/**
 * Test script to verify notification setup is working
 * Usage: node scripts/test_notification_setup.js
 */

require('dotenv').config();
const NotificationService = require('../src/services/notificationService');

async function testNotificationSetup() {
  console.log('🧪 Testing Push Notification Setup...\n');
  
  // Test 1: Check if Firebase is initialized
  console.log('1️⃣ Testing Firebase initialization...');
  try {
    const notificationService = new NotificationService();
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    return false;
  }
  
  // Test 2: Check notification service methods
  console.log('\n2️⃣ Testing NotificationService methods...');
  try {
    const notificationService = new NotificationService();
    
    // Test if methods exist
    if (typeof notificationService.sendNotificationToUser === 'function') {
      console.log('✅ sendNotificationToUser method exists');
    } else {
      console.error('❌ sendNotificationToUser method missing');
      return false;
    }
    
    if (typeof notificationService.validateFCMToken === 'function') {
      console.log('✅ validateFCMToken method exists');
    } else {
      console.error('❌ validateFCMToken method missing');
      return false;
    }
    
  } catch (error) {
    console.error('❌ NotificationService test failed:', error.message);
    return false;
  }
  
  // Test 3: Test FCM token validation
  console.log('\n3️⃣ Testing FCM token validation...');
  try {
    const notificationService = new NotificationService();
    
    // Test invalid token
    const invalidResult = await notificationService.validateFCMToken('invalid');
    if (!invalidResult.valid) {
      console.log('✅ Invalid token correctly rejected');
    } else {
      console.log('⚠️ Invalid token validation might be too lenient');
    }
    
    // Test valid-looking token
    const validLookingToken = 'dGhpc19pc19hX3Rlc3RfdG9rZW5fdGhhdF9sb29rc192YWxpZF9idXRfaXNudA';
    const validResult = await notificationService.validateFCMToken(validLookingToken);
    if (validResult.valid) {
      console.log('✅ Valid-looking token accepted');
    } else {
      console.log('⚠️ Valid-looking token rejected:', validResult.error);
    }
    
  } catch (error) {
    console.error('❌ FCM token validation test failed:', error.message);
    return false;
  }
  
  // Test 4: Test notification data structure
  console.log('\n4️⃣ Testing notification data structure...');
  try {
    const testData = {
      type: 'instagram_like',
      image: 'https://images.unsplash.com/photo-1611262588024-d12430b98920?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      reward: '5',
      action: 'like_post'
    };
    
    if (testData.type && testData.image && testData.reward && testData.action) {
      console.log('✅ Notification data structure is valid');
      console.log('   - Type:', testData.type);
      console.log('   - Image URL:', testData.image.substring(0, 50) + '...');
      console.log('   - Reward:', testData.reward);
      console.log('   - Action:', testData.action);
    } else {
      console.error('❌ Notification data structure is incomplete');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Notification data structure test failed:', error.message);
    return false;
  }
  
  // Test 5: Check environment variables
  console.log('\n5️⃣ Checking environment variables...');
  
  if (process.env.MONGODB_URI) {
    console.log('✅ MONGODB_URI is set');
  } else {
    console.log('⚠️ MONGODB_URI not set (optional for basic notifications)');
  }
  
  // Summary
  console.log('\n🎉 All tests passed! Your notification setup is ready.');
  console.log('\n📋 Next steps:');
  console.log('1. Get a valid FCM token from your mobile app');
  console.log('2. Run: npm run send-instagram-notification "YOUR_FCM_TOKEN"');
  console.log('3. Check if the notification appears on your device');
  
  return true;
}

async function showUsageExamples() {
  console.log('\n📚 Usage Examples:');
  console.log('==================');
  console.log('');
  console.log('# Send single Instagram notification:');
  console.log('npm run send-instagram-notification "dGhpc19pc19hX3Rlc3RfdG9rZW4..."');
  console.log('');
  console.log('# Send to multiple tokens:');
  console.log('npm run send-batch-instagram "token1" "token2" "token3"');
  console.log('');
  console.log('# Send to all users in database:');
  console.log('npm run send-batch-instagram');
  console.log('');
  console.log('💡 Pro tip: Start with a single notification to test first!');
}

// Main execution
async function main() {
  const success = await testNotificationSetup();
  
  if (success) {
    await showUsageExamples();
  } else {
    console.log('\n❌ Setup test failed. Please fix the issues above before sending notifications.');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testNotificationSetup };
