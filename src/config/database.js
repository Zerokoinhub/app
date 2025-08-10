const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('Environment check:', {
      hasMongoURI: !!process.env.MONGODB_URI,
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT
    });

    // Use fallback URI if environment variable is not set
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://mstorsulam786:1nkSX6KEOBmdx0ox@cluster0.frhaken.mongodb.net/zero_koin';
    
    console.log('Attempting to connect to MongoDB...');
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.error('Please check your MongoDB connection string and credentials.');
    console.error('If you have a .env file, make sure MONGODB_URI is set correctly.');
    throw error;
  }
};

module.exports = connectDB; 