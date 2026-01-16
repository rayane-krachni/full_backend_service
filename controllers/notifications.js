const notificationService = require("../services/notifications");
const { DataValidationError } = require("../exceptions");

/**
 * Get user notifications
 */
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const result = await notificationService.getUserNotifications(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true',
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get user notifications error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

/**
 * Send test notification (for testing purposes only)
 */
const sendTestNotification = async (req, res) => {
  try {
    const { userId, docId, docType, action, metadata } = req.body;

    // Validate required fields
    if (!userId || !docId || !docType || !action) {
      throw new DataValidationError("Missing required fields: userId, docId, docType, action");
    }

    // Validate action exists in templates
    if (!notificationService.NOTIFICATION_TEMPLATES[action]) {
      throw new DataValidationError(`Invalid action: ${action}`);
    }

    const notification = await notificationService.createAndSend({
      userId,
      docId,
      docType,
      action,
      metadata: metadata || {},
    });

    return res.status(201).json({
      success: true,
      data: notification,
      message: "Test notification sent successfully",
    });
  } catch (error) {
    console.error("Send test notification error:", error);
    
    if (error instanceof DataValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await notificationService.markAsRead(notificationId, userId);

    return res.status(200).json({
      success: true,
      data: notification,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    
    if (error.name === 'RecordNotFoundError') {
      return res.status(404).json({
        success: false,
        error: "Notification not found",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await notificationService.markAllAsRead(userId);

    return res.status(200).json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
      },
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

/**
 * Delete notification
 */
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await notificationService.deleteNotification(notificationId, userId);

    return res.status(200).json({
      success: true,
      data: notification,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    
    if (error.name === 'RecordNotFoundError') {
      return res.status(404).json({
        success: false,
        error: "Notification not found",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

/**
 * Get notification statistics
 */
const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await notificationService.getUserNotifications(userId, {
      page: 1,
      limit: 1,
    });

    return res.status(200).json({
      success: true,
      data: {
        unreadCount: result.unreadCount,
        totalCount: result.pagination.total,
      },
    });
  } catch (error) {
    console.error("Get notification stats error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

module.exports = {
  getUserNotifications,
  sendTestNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats,
};