#!/usr/bin/env node

/**
 * Script to reset all users' time-related data
 * This will clear session timers, time validation data, and reset session states
 */

const { MongoClient } = require('mongodb');

// MongoDB connection string
const MONGODB_URI = 'mongodb+srv://mstorsulam786:1nkSX6KEOBmdx0ox@cluster0.frhaken.mongodb.net/zero_koin';

async function resetUsersTime() {
  let client;
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db('zero_koin');
    const usersCollection = db.collection('users');
    
    console.log('📊 Getting user count...');
    const totalUsers = await usersCollection.countDocuments();
    console.log(`Found ${totalUsers} users to reset`);
    
    if (totalUsers === 0) {
      console.log('No users found. Exiting...');
      return;
    }
    
    // Confirm before proceeding
    console.log('\n⚠️  WARNING: This will reset time-related data for ALL users!');
    console.log('This includes:');
    console.log('- Session unlock times');
    console.log('- Session claim status');
    console.log('- Time validation data');
    console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n🔄 Starting reset process...');
    
    // Reset all users' time-related data
    const resetResult = await usersCollection.updateMany(
      {}, // Match all users
      {
        $set: {
          // Reset sessions array - unlock session 1, lock others
          sessions: [
            {
              sessionNumber: 1,
              unlockedAt: new Date(),
              isClaimed: false
            },
            {
              sessionNumber: 2,
              unlockedAt: null,
              isClaimed: false
            },
            {
              sessionNumber: 3,
              unlockedAt: null,
              isClaimed: false
            },
            {
              sessionNumber: 4,
              unlockedAt: null,
              isClaimed: false
            }
          ],
          // Reset time validation related fields if they exist
          lastTimeValidation: null,
          timeValidationOffset: 0,
          lastServerSync: null,
          // Update timestamp
          updatedAt: new Date()
        },
        $unset: {
          // Remove any countdown timer fields
          countdownTimers: "",
          sessionTimers: "",
          activeTimers: "",
          // Remove any cached time data
          cachedServerTime: "",
          timeValidationCache: ""
        }
      }
    );
    
    console.log(`✅ Successfully reset ${resetResult.modifiedCount} users`);
    
    // Verify the reset by checking a few users
    console.log('\n🔍 Verifying reset...');
    const sampleUsers = await usersCollection.find({}).limit(3).toArray();
    
    sampleUsers.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Sessions: ${JSON.stringify(user.sessions, null, 2)}`);
      console.log(`  Updated: ${user.updatedAt}`);
      console.log('');
    });
    
    console.log('🎉 Time reset completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Users will need to restart the app to see changes');
    console.log('2. Session 1 will be immediately available');
    console.log('3. Other sessions will be locked until progression');
    
  } catch (error) {
    console.error('❌ Error resetting users time:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Add command line argument parsing
const args = process.argv.slice(2);
const forceReset = args.includes('--force') || args.includes('-f');

async function main() {
  if (!forceReset) {
    console.log('Usage: node reset_users_time.js [--force|-f]');
    console.log('');
    console.log('This script will reset ALL users\' time-related data.');
    console.log('Use --force or -f to skip the confirmation delay.');
    console.log('');
  }
  
  await resetUsersTime();
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { resetUsersTime };
