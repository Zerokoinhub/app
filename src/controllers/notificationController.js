const Notification = require('../models/Notification');

// Add a new notification (Admin only)
exports.addNotification = async (req, res) => {
  try {
    const { title, content } = req.body;
    const image = req.file ? req.file.path : null;

    if (!title || !content || !image) {
      return res.status(400).json({ message: 'Title, content, and image are required' });
    }

    const notification = new Notification({
      image,
      title,
      content
    });

    await notification.save();

    res.status(201).json({
      message: 'Notification added successfully',
      notification: {
        id: notification._id,
        image: notification.image,
        title: notification.title,
        content: notification.content,
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
        image: notification.image,
        title: notification.title,
        content: notification.content,
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
        id: notification._id,
        image: notification.image,
        title: notification.title,
        content: notification.content,
        isSent: notification.isSent,
        sentAt: notification.sentAt
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
    const { title, content, link } = req.body;
    const image = req.file ? req.file.path : null;
    if (!title || !content || !image) {
      return res.status(400).json({ message: 'Title, content, and image are required' });
    }
    const notification = new Notification({
      image,
      title,
      content,
      link,
      isSent: false
    });
    await notification.save();
    res.status(201).json({
      message: 'Upcoming notification added successfully',
      notification: {
        id: notification._id,
        image: notification.image,
        title: notification.title,
        content: notification.content,
        link: notification.link,
        isSent: notification.isSent,
        createdAt: notification.createdAt
      }
    });
  } catch (error) {
    console.error('Add upcoming notification error:', error.message);
    res.status(500).json({ message: 'Error adding upcoming notification', error: error.message });
  }
}; 