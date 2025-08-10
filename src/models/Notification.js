const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    default: ''
  },
  link: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['general', 'promotional', 'update', 'alert'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent', 'new-user'],
    default: 'normal'
  },
  isSent: {
    type: Boolean,
    default: false
  },
  sentAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema); 