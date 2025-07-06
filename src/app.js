const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const userRoutes = require('./routes/userRoutes');
const tokenRoutes = require('./routes/tokenRoutes');
const withdrawRoutes = require('./routes/withdrawRoutes');
const courseRoutes = require('./routes/courseRoutes');
const sessionNotificationService = require('./services/sessionNotificationService');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mstorsulam786:1nkSX6KEOBmdx0ox@cluster0.frhaken.mongodb.net/zero_koin';
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


mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');

    // Start the session notification service after DB connection
    sessionNotificationService.start();
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

// Notification service status and manual trigger (for testing)
app.get('/api/notifications/status', (req, res) => {
  const status = sessionNotificationService.getStatus();
  res.json({
    message: 'Session notification service status',
    ...status
  });
});

app.post('/api/notifications/trigger', async (req, res) => {
  try {
    await sessionNotificationService.triggerCheck();
    res.json({ message: 'Manual notification check triggered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error triggering notification check', error: error.message });
  }
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