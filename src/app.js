// Load environment variables first, before any other imports
const path = require('path');
const envPath = path.join(__dirname, '../.env');
console.log('🔧 Loading .env from:', envPath);
console.log('🔧 __dirname:', __dirname);
require('dotenv').config({ path: envPath });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/database');
const userRoutes = require('./routes/userRoutes');
const tokenRoutes = require('./routes/tokenRoutes');
const withdrawRoutes = require('./routes/withdrawRoutes');
const courseRoutes = require('./routes/courseRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const timeRoutes = require('./routes/timeRoutes');
const sessionNotificationService = require('./services/sessionNotificationService');
const autoNotificationService = require('./services/autoNotificationService');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/users', userRoutes);
app.use('/api/token', tokenRoutes);
app.use("/api/withdraw", withdrawRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/time', timeRoutes);

// Connect to MongoDB
connectDB()
  .then(() => {
    console.log('Connected to MongoDB successfully');

    // Start session notification service
    sessionNotificationService.start();
    console.log('🔔 Session notification service started');

    // Start automatic notification service
    autoNotificationService.start();
    console.log('📱 Automatic notification service started');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please try a different port.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});