const mongoose = require("mongoose");
const { RecordNotFoundError } = require("../exceptions");
const Notification = require("../models/notification");
const { User } = require("../models/user");
const admin = require("firebase-admin");

/* =========================
   FIREBASE INIT (ENV ONLY)
========================= */

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT is not defined");
}

let serviceAccount;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (err) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://spiritualcandle-default-rtdb.firebaseio.com",
  });
}

const messaging = admin.messaging();

/* =========================
   NOTIFICATION TEMPLATES
========================= */

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
  MESSAGE_RECEIVED: {
    title: { en: "New Message", ar: "رسالة جديدة", fr: "Nouveau message" },
    message: {
      en: "You have received a new message",
      ar: "لقد تلقيت رسالة جديدة",
      fr: "Vous avez reçu un nouveau message",
    },
  },
};

/* =========================
   CORE FUNCTIONS
========================= */

const create = async (notificationData) => {
  const { userId, docId, docType, action, metadata = {} } = notificationData;

  const template = NOTIFICATION_TEMPLATES[action];
  if (!template) {
    throw new Error(`No template found for action: ${action}`);
  }

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
};

const sendPushNotification = async (userId, title, message, data = {}) => {
  const user = await User.findById(userId).select(
    "firebaseToken preferredLanguage",
  );

  if (!user || !user.firebaseToken) return null;

  const lang = user.preferredLanguage || "en";

  const finalTitle =
    typeof title === "string" ? title : title[lang] || title.en;
  const finalMessage =
    typeof message === "string" ? message : message[lang] || message.en;

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
    android: { priority: "high" },
    apns: { payload: { aps: { sound: "default" } } },
  };

  return messaging.send(fcmMessage);
};

const createAndSend = async (notificationData) => {
  const user = await User.findById(notificationData.userId).select("language");
  const lang = user?.language || "en";

  const template = NOTIFICATION_TEMPLATES[notificationData.action];

  const title = template.title[lang] || template.title.en;
  const message = template.message[lang] || template.message.en;

  const notification = await create(notificationData);

  await sendPushNotification(notificationData.userId, title, message, {
    docId: notificationData.docId.toString(),
    docType: notificationData.docType,
    action: notificationData.action,
    notificationId: notification._id.toString(),
  });

  return notification;
};

const getUserNotifications = async (userId, { page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({ userId, isDeleted: false })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Notification.countDocuments({ userId, isDeleted: false });

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId, isDeleted: false },
    { isRead: true, readAt: new Date() },
    { new: true },
  );

  if (!notification) {
    throw new RecordNotFoundError(Notification, "_id", notificationId);
  }

  return notification;
};

const markAllAsRead = async (userId) => {
  return Notification.updateMany(
    { userId, isRead: false, isDeleted: false },
    { isRead: true, readAt: new Date() },
  );
};

const deleteNotification = async (notificationId, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isDeleted: true },
    { new: true },
  );

  if (!notification) {
    throw new RecordNotFoundError(Notification, "_id", notificationId);
  }

  return notification;
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
