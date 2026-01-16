const express = require("express");
const router = express.Router();
const controller = require("../controllers/appointments");
const validator = require("../middlewares/validator");
const passport = require("passport");
const { handleDocuments } = require("../middlewares/appointments");
const { authorize } = require("../middlewares/auth");
const path = require("path");

router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  authorize("SUPER_ADMIN", "ADMIN", "PATIENT", "NURSE", "DOCTOR", "EMPLOYEE"),
  controller.get
);

router.get(
  "/my",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT", "NURSE", "DOCTOR", "EMPLOYEE"),
  controller.getMy
);

router.get(
  "/count",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "NURSE", "DOCTOR", "EMPLOYEE", "PATIENT"),
  controller.countByStatus
);

router.get(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT", "NURSE", "DOCTOR", "EMPLOYEE"),
  controller.getById
);

router.get(
  "/waiting/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT", "NURSE", "DOCTOR", "EMPLOYEE"),
  controller.getTodayWaitingList
);

router.patch(
  "/waiting/reorder",
  passport.authenticate("jwt", { session: false }),
  authorize("DOCTOR"),
  controller.reorderQueue
);

router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT", "NURSE", "DOCTOR", "EMPLOYEE"),
  handleDocuments,
  controller.create
);

router.patch(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT", "NURSE", "DOCTOR", "EMPLOYEE"),
  handleDocuments,
  controller.patchById
);

router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "NURSE", "DOCTOR", "EMPLOYEE"),
  controller.deleteById
);

module.exports = router;
