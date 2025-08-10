const Notification = require('../models/Notification');
const User = require('../models/User');

// Add a new notification (Admin only)
exports.addNotification = async (req, res) => {
  try {
    const { title, content, message, link, type, priority } = req.body;
    const image = req.file ? req.file.path : null;

    if (!title || (!content && !message) || !image) {
      return res.status(400).json({ message: 'Title, content/message, and image are required' });
    }

    const notification = new Notification({
      image: image,
      imageUrl: image,
      title,
      content: content || message,
      message: message || content,
      link: link || '',
      type: type || 'general',
      priority: priority || 'normal'
    });

    await notification.save();

    res.status(201).json({
      message: 'Notification added successfully',
      notification: {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        imageUrl: notification.imageUrl || notification.image,
        link: notification.link,
        type: notification.type,
        priority: notification.priority,
        isSent: notification.isSent,
        createdAt: notification.createdAt
      }
    });
  } catch (error) {
    console.error('Add notification error:', error.message);
    res.status(500).json({ message: 'Error adding notification', error: error.message });
  }
};

// Get all notifications (Public)
exports.getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({}).sort({ createdAt: -1 });
    
    res.status(200).json({
      notifications: notifications.map(notification => ({
        id: notification._id,
        title: notification.title,
        content: notification.message || notification.content,
        imageUrl: notification.imageUrl || notification.image,
        link: notification.link,
        isSent: notification.isSent,
        sentAt: notification.sentAt,
        createdAt: notification.createdAt
      }))
    });
  } catch (error) {
    console.error('Get notifications error:', error.message);
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

// Mark notification as sent (Admin only)
exports.markAsSent = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isSent = true;
    notification.sentAt = new Date();
    await notification.save();

    res.status(200).json({
      message: 'Notification marked as sent successfully',
      notification: {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        imageUrl: notification.imageUrl || notification.image,
        link: notification.link,
        type: notification.type,
        priority: notification.priority,
        isSent: notification.isSent,
        sentAt: notification.sentAt,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
        __v: notification.__v
      }
    });
  } catch (error) {
    console.error('Mark as sent error:', error.message);
    res.status(500).json({ message: 'Error marking notification as sent', error: error.message });
  }
};

// Delete a notification (Admin only)
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error.message);
    res.status(500).json({ message: 'Error deleting notification', error: error.message });
  }
};

// Debug: Get raw notification data (temporary)
exports.getRawNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({
      rawNotification: notification,
      hasImage: !!notification.image,
      hasContent: !!notification.content
    });
  } catch (error) {
    console.error('Get raw notification error:', error.message);
    res.status(500).json({ message: 'Error fetching raw notification', error: error.message });
  }
};

// Add an upcoming notification (Admin only)
exports.addUpcomingNotification = async (req, res) => {
  try {
    const { title, content, message, link, type, priority } = req.body;
    const image = req.file ? req.file.path : null;
    if (!title || (!content && !message) || !image) {
      return res.status(400).json({ message: 'Title, content/message, and image are required' });
    }
    const notification = new Notification({
      image: image,
      imageUrl: image,
      title,
      content: content || message,
      message: message || content,
      link: link || '',
      type: type || 'general',
      priority: priority || 'normal',
      isSent: false
    });
    await notification.save();
    res.status(201).json({
      message: 'Upcoming notification added successfully',
      notification: {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        imageUrl: notification.imageUrl || notification.image,
        link: notification.link,
        type: notification.type,
        priority: notification.priority,
        isSent: notification.isSent,
        createdAt: notification.createdAt
      }
    });
  } catch (error) {
    console.error('Add upcoming notification error:', error.message);
    res.status(500).json({ message: 'Error adding upcoming notification', error: error.message });
  }
};

// Mark notification as read for a user (Protected)
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { uid } = req.user; // From Firebase auth middleware
    const { notificationId } = req.params;

    // Find the user
    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if notification exists
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Check if notification is already marked as read
    const alreadyRead = user.readNotifications.some(
      readNotif => readNotif.notificationId.toString() === notificationId
    );

    if (!alreadyRead) {
      // Add to read notifications
      user.readNotifications.push({
        notificationId: notificationId,
        readAt: new Date()
      });
      await user.save();
    }

    res.status(200).json({
      message: 'Notification marked as read successfully',
      notificationId: notificationId
    });
  } catch (error) {
    console.error('Mark notification as read error:', error.message);
    res.status(500).json({ message: 'Error marking notification as read', error: error.message });
  }
};

// Mark all notifications as read for a user (Protected)
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const { uid } = req.user; // From Firebase auth middleware

    // Find the user
    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all notifications
    const allNotifications = await Notification.find({});

    // Get already read notification IDs
    const readNotificationIds = user.readNotifications.map(
      readNotif => readNotif.notificationId.toString()
    );

    // Find unread notifications
    const unreadNotifications = allNotifications.filter(
      notification => !readNotificationIds.includes(notification._id.toString())
    );

    // Add unread notifications to read list
    const newReadNotifications = unreadNotifications.map(notification => ({
      notificationId: notification._id,
      readAt: new Date()
    }));

    user.readNotifications.push(...newReadNotifications);
    await user.save();

    res.status(200).json({
      message: 'All notifications marked as read successfully',
      markedAsRead: newReadNotifications.length
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error.message);
    res.status(500).json({ message: 'Error marking all notifications as read', error: error.message });
  }
};

// Get unread notification count for a user (Protected)
exports.getUnreadNotificationCount = async (req, res) => {
  try {
    const { uid } = req.user; // From Firebase auth middleware

    // Find the user
    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all notifications
    const allNotifications = await Notification.find({});

    // Get already read notification IDs
    const readNotificationIds = user.readNotifications.map(
      readNotif => readNotif.notificationId.toString()
    );

    // Count unread notifications
    const unreadCount = allNotifications.filter(
      notification => !readNotificationIds.includes(notification._id.toString())
    ).length;

    res.status(200).json({
      unreadCount: unreadCount
    });
  } catch (error) {
    console.error('Get unread notification count error:', error.message);
    res.status(500).json({ message: 'Error getting unread notification count', error: error.message });
  }
};

// Get notifications with read status for a user (Protected)
exports.getNotificationsWithReadStatus = async (req, res) => {
  try {
    const { uid } = req.user; // From Firebase auth middleware

    // Find the user
    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all notifications
    const notifications = await Notification.find({}).sort({ createdAt: -1 });

    // Get already read notification IDs
    const readNotificationIds = user.readNotifications.map(
      readNotif => readNotif.notificationId.toString()
    );

    // Add read status to each notification
    const notificationsWithReadStatus = notifications.map(notification => ({
      _id: notification._id,
      title: notification.title,
      message: notification.content || notification.message,
      imageUrl: notification.imageUrl || notification.image,
      link: notification.link,
      type: notification.type || 'general',
      priority: notification.priority || 'normal',
      isSent: notification.isSent,
      sentAt: notification.sentAt,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      __v: notification.__v,
      isRead: readNotificationIds.includes(notification._id.toString())
    }));

    res.status(200).json({
      notifications: notificationsWithReadStatus
    });
  } catch (error) {
    console.error('Get notifications with read status error:', error.message);
    res.status(500).json({ message: 'Error fetching notifications with read status', error: error.message });
  }
};