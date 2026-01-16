const express = require("express");
const router = express.Router();
const controller = require("../controllers/homeCare");
const passport = require("passport");
const { authorize } = require("../middlewares/auth");

router.get(
  "/services",
  passport.authenticate("jwt", { session: false }),
  authorize("PATIENT", "ADMIN", "DOCTOR", "NURSE"),
  controller.getServices
);

// Request Management
router.post(
  "/request",
  passport.authenticate("jwt", { session: false }),
  authorize("PATIENT"),
  controller.createRequest
);

router.get(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("PATIENT", "DOCTOR", "NURSE", "ADMIN"),
  controller.getRequestDetails
);

// Professional Management
router.get(
  "/professionals",
  passport.authenticate("jwt", { session: false }),
  authorize("PATIENT"),
  controller.getAvailableProfessionals
);

// Status Updates
router.put(
  "/:id/accept",
  passport.authenticate("jwt", { session: false }),
  authorize("DOCTOR", "NURSE"),
  controller.acceptRequest
);

// Two-key validation completion endpoints
router.put(
  "/:id/doctor-confirm",
  passport.authenticate("jwt", { session: false }),
  authorize("DOCTOR", "NURSE"),
  controller.doctorConfirmCompletion
);

router.put(
  "/:id/patient-confirm",
  passport.authenticate("jwt", { session: false }),
  authorize("PATIENT"),
  controller.patientConfirmCompletion
);

// Legacy completion endpoint (kept for backward compatibility)
router.put(
  "/:id/complete",
  passport.authenticate("jwt", { session: false }),
  authorize("DOCTOR", "NURSE"),
  controller.completeRequest
);

// Reporting
router.post(
  "/:id/report",
  passport.authenticate("jwt", { session: false }),
  authorize("DOCTOR", "NURSE"),
  controller.submitReport
);

router.post(
  '/:id/location',
  passport.authenticate('jwt', { session: false }),
  authorize('DOCTOR', 'NURSE', 'DRIVER'),
  controller.updateLocation
);

router.get(
  '/:id/location',
  passport.authenticate('jwt', { session: false }),
  authorize('PATIENT', 'DOCTOR', 'NURSE', 'ADMIN'),
  controller.getLocation
);

module.exports = router;