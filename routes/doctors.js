const express = require("express");
const router = express.Router();
const controller = require("../controllers/doctors");
const user = require("../controllers/users");
const passport = require("passport");
const {  authorize } = require("../middlewares/auth");
router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT", "DOCTOR"),
  controller.get
);
router.get(
  "/patients",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "DOCTOR"),
  controller.getDoctorPatients
);

router.get(
  "/calender/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT"),
  user.getCalender
);
router.get(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT", "EMPLOYEE", "NURSE", "DOCTOR"),
  controller.getById
);

router.patch(
  "/:id/documents/reject",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  controller.rejectDoc
);

router.patch(
  "/:id/documents/approve",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  controller.approveDoc
);

// SOS Alerts (Employer/Admin Doctor Only)
router.post(
  "/sos",
  passport.authenticate("jwt", { session: false }),
  authorize("DOCTOR", "NURSE", "EMPLOYEE"), // Allow employees to send SOS
  controller.sendSOS
);

router.get(
  "/sos",
  passport.authenticate("jwt", { session: false }),
  authorize("DOCTOR"), // Employer viewing alerts
  controller.getSOSAlerts
);

module.exports = router;
