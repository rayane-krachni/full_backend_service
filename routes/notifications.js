
const controller = require("../controllers/notifications");
const express = require("express");
const router = express.Router();
const { uploadAttachments } = require('../middlewares/messages');
const validator = require("../middlewares/validator");
const passport = require("passport");
const { authorize } = require("../middlewares/auth");

router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  authorize("DOCTOR", "NURSE", "PATIENT", "EMPLOYEE", "ADMIN"),
  controller.getUserNotifications
);
router.get(
  "/stats",
  passport.authenticate("jwt", { session: false }),
  authorize("DOCTOR", "NURSE", "PATIENT", "EMPLOYEE", "ADMIN"),
  controller.getNotificationStats
);

/**
 * @route POST /api/notifications/test
 * @desc Send test notification (for testing purposes only)
 * @access Private
 * @body {string} userId - Target user ID
 * @body {string} docId - Document ID
 * @body {string} docType - Document type (APPOINTMENT, MESSAGE, WITHDRAWAL, ORGANIZATION)
 * @body {string} action - Notification action
 * @body {object} metadata - Additional metadata (optional)
 */

router.post(
  "/test",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT", "DOCTOR", "EMPLOYEE", "NURSE"),
  controller.sendTestNotification
);

router.put(
  "/:notificationId/read",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT", "DOCTOR", "EMPLOYEE", "NURSE"),
  controller.markAsRead
);

router.put(
  "/read-all",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT", "DOCTOR", "EMPLOYEE", "NURSE"),
  controller.markAllAsRead
);

// router.delete(
//   "/:notificationId",
//   passport.authenticate("jwt", { session: false }),
//   authorize("ADMIN", "PATIENT", "DOCTOR", "EMPLOYEE", "NURSE"),
//   controller.getById
// );

module.exports = router;
