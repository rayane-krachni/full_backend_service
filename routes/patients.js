const express = require("express");
const router = express.Router();
const controller = require("../controllers/patients");
const user = require("../controllers/users");
const passport = require("passport");
const {  authorize } = require("../middlewares/auth");
// router.get(
//   "/",
//   passport.authenticate("jwt", { session: false }),
//   authorize("ADMIN", "PATIENT"),
//   controller.get
// );
router.get(
  "/doctors",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT"),
  controller.getPatientDoctors
);

// router.get(
//   "/calender/:id",
//   passport.authenticate("jwt", { session: false }),
//   authorize("ADMIN", "PATIENT"),
//   user.getCalender
// );
router.get(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT", "DOCTOR"),
  controller.getById
);

module.exports = router;
