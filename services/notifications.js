const { default: mongoose } = require("mongoose");
const { RecordNotFoundError, DataValidationError } = require("../exceptions");
const Notification = require("../models/notification");
const { User } = require("../models/user");
const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin SDK
const serviceAccount = require(
  path.join(
    __dirname,
    "..",
    "data",
    "static",
    "private",
    //"spiritualcandle.json"
  ),
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://spiritualcandle-default-rtdb.firebaseio.com",
  });
}

const messaging = admin.messaging();

// Notification message templates
const NOTIFICATION_TEMPLATES = {
  APPOINTMENT_CREATED: {
    title: {
      en: "New Appointment",
      ar: "موعد جديد",
      fr: "Nouveau rendez-vous",
    },
    message: {
      en: "You have a new appointment scheduled",
      ar: "لديك موعد جديد مجدول",
      fr: "Vous avez un nouveau rendez-vous programmé",
    },
  },
  APPOINTMENT_UPDATED: {
    title: {
      en: "Appointment Updated",
      ar: "تم تحديث الموعد",
      fr: "Rendez-vous mis à jour",
    },
    message: {
      en: "Your appointment has been updated",
      ar: "تم تحديث موعدك",
      fr: "Votre rendez-vous a été mis à jour",
    },
  },
  APPOINTMENT_ACCEPTED: {
    title: {
      en: "Appointment Accepted",
      ar: "تم قبول الموعد",
      fr: "Rendez-vous accepté",
    },
    message: {
      en: "Your appointment has been accepted",
      ar: "تم قبول موعدك",
      fr: "Votre rendez-vous a été accepté",
    },
  },
  APPOINTMENT_REJECTED: {
    title: {
      en: "Appointment Rejected",
      ar: "تم رفض الموعد",
      fr: "Rendez-vous rejeté",
    },
    message: {
      en: "Your appointment has been rejected",
      ar: "تم رفض موعدك",
      fr: "Votre rendez-vous a été rejeté",
    },
  },
  APPOINTMENT_COMPLETED: {
    title: {
      en: "Appointment Completed",
      ar: "تم إكمال الموعد",
      fr: "Rendez-vous terminé",
    },
    message: {
      en: "Your appointment has been completed",
      ar: "تم إكمال موعدك",
      fr: "Votre rendez-vous a été terminé",
    },
  },
  APPOINTMENT_DOCTOR_ASSIGNED: {
    title: {
      en: "New Appointment Assigned",
      ar: "تم تعيين موعد جديد",
      fr: "Nouveau rendez-vous assigné",
    },
    message: {
      en: "You have been assigned a new appointment",
      ar: "تم تعيين موعد جديد لك",
      fr: "Un nouveau rendez-vous vous a été assigné",
    },
  },
  APPOINTMENT_NEXT_PATIENT: {
    title: {
      en: "Next Appointment",
      ar: "الموعد التالي",
      fr: "Prochain rendez-vous",
    },
    message: {
      en: "You have an upcoming appointment",
      ar: "لديك موعد قادم",
      fr: "Vous avez un rendez-vous à venir",
    },
  },
  MESSAGE_RECEIVED: {
    title: {
      en: "New Message",
      ar: "رسالة جديدة",
      fr: "Nouveau message",
    },
    message: {
      en: "You have received a new message",
      ar: "لقد تلقيت رسالة جديدة",
      fr: "Vous avez reçu un nouveau message",
    },
  },
  WITHDRAWAL_APPROVED: {
    title: {
      en: "Withdrawal Approved",
      ar: "تم الموافقة على السحب",
      fr: "Retrait approuvé",
    },
    message: {
      en: "Your withdrawal request has been approved and is being processed",
      ar: "تم الموافقة على طلب السحب الخاص بك وهو قيد المعالجة",
      fr: "Votre demande de retrait a été approuvée et est en cours de traitement",
    },
  },
  WITHDRAWAL_PROCESSED: {
    title: {
      en: "Withdrawal Processed",
      ar: "تم معالجة السحب",
      fr: "Retrait traité",
    },
    message: {
      en: "Your money has been released and transferred",
      ar: "تم تحرير أموالك وتحويلها",
      fr: "Votre argent a été libéré et transféré",
    },
  },
  SOS_ALERT: {
    title: {
      en: "SOS Alert",
      ar: "تنبيه SOS",
      fr: "Alerte SOS",
    },
    message: {
      en: "Emergency alert received from an employee",
      ar: "تنبيه طوارئ من موظف",
      fr: "Alerte d'urgence reçue d'un employé",
    },
  },
};

/**
 * Create and save a notification
 */
const create = async (notificationData) => {
  try {
    const { userId, docId, docType, action, metadata = {} } = notificationData;

    // Get notification template
    const template = NOTIFICATION_TEMPLATES[action];
    if (!template) {
      throw new Error(`No template found for action: ${action}`);
    }

    // Create notification
    const notification = new Notification({
      userId,
      docId,
      docType,
      action,
      title: template.title,
      message: template.message,
      metadata,
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error("Create notification error:", error);
    throw error;
  }
};

/**
 * Send push notification via Firebase FCM
 */
const sendPushNotification = async (userId, title, message, data = {}) => {
  try {
    // Get user's Firebase token
    const user = await User.findById(userId).select(
      "firebaseToken preferredLanguage",
    );
    console.log(userId);
    if (!user || !user.firebaseToken) {
      console.log(`No Firebase token found for user: ${userId}`);
      return null;
    }

    // Get user's preferred language or default to English
    const lang = user.preferredLanguage || "en";

    // Handle both string and object title/message parameters
    let finalTitle, finalMessage;

    if (typeof title === "string") {
      finalTitle = title;
    } else {
      finalTitle = title[lang] || title.fr || title.en;
    }

    if (typeof message === "string") {
      finalMessage = message;
    } else {
      finalMessage = message[lang] || message.fr || message.en;
    }

    // Prepare FCM message
    const fcmMessage = {
      token: user.firebaseToken,
      notification: {
        title: finalTitle,
        body: finalMessage,
      },
      data: {
        ...data,
        userId: userId.toString(),
      },
      android: {
        priority: "high",
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    };
    console.log(fcmMessage);

    // Send notification
    const response = await messaging.send(fcmMessage);
    console.log("Successfully sent message:", response);
    return response;
  } catch (error) {
    console.error("Error sending push notification:", error);
    if (error.code === "messaging/registration-token-not-registered") {
      // Token is invalid, remove it from user
      await User.findByIdAndUpdate(userId, { $unset: { firebaseToken: 1 } });
    }
    throw error;
  }
};

/**
 * Create notification and send push notification
 */
const createAndSend = async (notificationData) => {
  try {
    console.log(notificationData.userId);
    // Get user's preferred language
    const user = await User.findById(notificationData.userId).select(
      "language",
    );
    const userLanguage = user?.language || "en";

    // Get template and localize title/message
    const template = NOTIFICATION_TEMPLATES[notificationData.action];
    const localizedTitle = template.title[userLanguage] || template.title.en;
    const localizedMessage =
      template.message[userLanguage] || template.message.en;

    // Create notification with localized content
    const localizedNotificationData = {
      ...notificationData,
      title: {
        en: localizedTitle,
        ar: localizedTitle,
        fr: localizedTitle,
      },
      message: {
        en: localizedMessage,
        ar: localizedMessage,
        fr: localizedMessage,
      },
    };

    const notification = await create(localizedNotificationData);

    // Send push notification with localized content
    await sendPushNotification(
      notificationData.userId,
      localizedTitle,
      localizedMessage,
      {
        docId: notificationData.docId.toString(),
        docType: notificationData.docType,
        action: notificationData.action,
        notificationId: notification._id.toString(),
      },
    );

    return notification;
  } catch (error) {
    console.error("Create and send notification error:", error);
    throw error;
  }
};

/**
 * Get user notifications with pagination
 */
const getUserNotifications = async (
  userId,
  { page = 1, limit = 20, unreadOnly = false } = {},
) => {
  try {
    // Get user's preferred language
    const user = await User.findById(userId).select("language");
    const userLanguage = user?.language || "en";

    const skip = (page - 1) * limit;
    const filter = {
      userId,
      isDeleted: false,
    };

    if (unreadOnly) {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Localize notifications based on user's language
    const localizedNotifications = notifications.map((notification) => {
      let localizedTitle = notification.title;
      let localizedMessage = notification.message;

      // If title/message are objects with language keys, extract the user's language
      if (
        typeof notification.title === "object" &&
        notification.title !== null
      ) {
        localizedTitle =
          notification.title[userLanguage] ||
          notification.title.en ||
          notification.title;
      }
      if (
        typeof notification.message === "object" &&
        notification.message !== null
      ) {
        localizedMessage =
          notification.message[userLanguage] ||
          notification.message.en ||
          notification.message;
      }

      return {
        ...notification,
        title: localizedTitle,
        message: localizedMessage,
      };
    });

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
      isDeleted: false,
    });

    return {
      notifications: localizedNotifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  } catch (error) {
    console.error("Get user notifications error:", error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId, isDeleted: false },
      { isRead: true, readAt: new Date() },
      { new: true },
    );

    if (!notification) {
      throw new RecordNotFoundError(Notification, "_id", notificationId);
    }

    return notification;
  } catch (error) {
    console.error("Mark notification as read error:", error);
    throw error;
  }
};

/**
 * Mark all user notifications as read
 */
const markAllAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      { userId, isRead: false, isDeleted: false },
      { isRead: true, readAt: new Date() },
    );

    return result;
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    throw error;
  }
};

/**
 * Delete notification
 */
const deleteNotification = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isDeleted: true },
      { new: true },
    );

    if (!notification) {
      throw new RecordNotFoundError(Notification, "_id", notificationId);
    }

    return notification;
  } catch (error) {
    console.error("Delete notification error:", error);
    throw error;
  }
};

module.exports = {
  create,
  createAndSend,
  sendPushNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  NOTIFICATION_TEMPLATES,
};
