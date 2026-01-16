const express = require("express");
const router = express.Router();
const controller = require("../controllers/messages");
const { uploadAttachments } = require('../middlewares/messages');
const validator = require("../middlewares/validator");
const passport = require("passport");
const { authorize } = require("../middlewares/auth");

router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  controller.get
);
router.get(
  "/conversation/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT", "DOCTOR", "EMPLOYEE", "NURSE"),
  controller.getConversation
);

router.get(
  "/patient",
  passport.authenticate("jwt", { session: false }),
  authorize("PATIENT"),
  controller.getByPatient
);

router.get(
  "/doctor",
  passport.authenticate("jwt", { session: false }),
  authorize("DOCTOR", "EMPLOYEE", "NURSE"),
  controller.getByDoctor
);

router.get(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  controller.getById
);

router.post(
  "/patient/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("DOCTOR", "EMPLOYEE", "NURSE"),
  uploadAttachments,
  controller.sendToPatient
);

router.post(
  "/doctor/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("PATIENT"),
  uploadAttachments,
  controller.sendToDoctor
);

router.patch(
  "/mark-seen/:receiver",
  passport.authenticate("jwt", { session: false }),
  authorize("PATIENT", "DOCTOR", "EMPLOYEE", "NURSE"),
  controller.markSeen
);

// router.patch(
//   "/:receiver/mark-seen",
//   passport.authenticate("jwt", { session: false }),
//   authorize("DOCTOR"),
//   controller.markSeen
// );

router.patch(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  controller.patchById
);

router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  controller.deleteById
);

module.exports = router;
