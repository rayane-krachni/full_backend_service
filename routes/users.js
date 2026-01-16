const express = require("express");
const router = express.Router();
const controller = require("../controllers/users");
const validator = require("../middlewares/validator");
const passport = require("passport");
const { handlePicture } = require("../middlewares/user");
const { handleDoctorDocuments } = require("../middlewares/documents");
const { setTokenType, authorize } = require("../middlewares/auth");

// Emplyees
router.get(
  "/employee/",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "DOCTOR"),
  controller.getEmployees
);
router.patch(
  "/employee/:id",
  handlePicture,
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "DOCTOR"),
  controller.patchById
);
router.post(
  "/employee/create",
  passport.authenticate("jwt", { session: false }),
  handlePicture,
  authorize("ADMIN", "DOCTOR"),
  controller.createEmployee
);
router.get(
  "/employee/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "DOCTOR"),
  controller.getById
);
router.delete(
  "/employee/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "DOCTOR"),
  controller.deleteById
);

// Family
router.patch(
  "/familly/:id",
  handlePicture,
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT"),
  controller.editFamilyMember
);
router.post(
  "/familly/create",
  passport.authenticate("jwt", { session: false }),
  handlePicture,
  authorize("PATIENT"),
  controller.createFamily
);
router.get(
  "/familly",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT"),
  // validator("USERS", "PATCH"),
  controller.getFamilyMembers
);
router.delete(
  "/familly/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT"),
  controller.deleteFamilyMember
);

// User
router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.get
);

router.get(
  "/get-me",
  passport.authenticate("jwt", { session: false }),
  authorize("SUPER_ADMIN", "ADMIN", "EMPLOYEE", "DOCTOR", "PATIENT", "NURSE"),
  controller.me
);

router.patch(
  "/update",
  passport.authenticate("jwt", { session: false }),
  authorize("DOCTOR", "PATIENT", "EMPLOYEE", "NURSE"),
  handlePicture,
  controller.updateProfile
);

router.patch(
  "/setup",
  passport.authenticate("jwt", { session: false }),
  authorize("DOCTOR", "PATIENT", "NURSE"),
  handleDoctorDocuments,
  controller.setupProfile
);

router.patch(
  "/employee/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "DOCTOR"),
  controller.updateEmployee
);

router.get(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "DOCTOR"),
  controller.getById
);

router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  handlePicture,
  validator("USERS", "CREATE"),
  controller.create
);

router.post("/resend", handlePicture, controller.resend);

router.post(
  "/create",
  handlePicture,
  validator("USERS", "CREATE"),
  controller.create
);

router.patch(
  "/activate-account",
  // passport.authenticate("jwt", { session: false }),
  // authorize("USER"),
  // validator("USERS", "CHANGE_PASSWORD"),
  controller.activateAccount
);

router.patch(
  "/change-password",
  passport.authenticate("jwt", { session: false }),
  authorize("USER"),
  validator("USERS", "CHANGE_PASSWORD"),
  controller.changePasswordById
);

router.patch(
  "/forgot-password",
  // validator("USERS", "FORGOT_PASSWORD"),
  controller.forgotPassword
);

router.patch(
  "/reset-password",
  setTokenType("RESET_PASSWORD"),
  passport.authenticate("jwt", { session: false }),
  authorize("USER", "DOCTOR", "PATIENT", "EMPLOYEE", "NURSE"),
  // validator("USERS", "RESET_PASSWORD"),
  controller.resetPassword
);

router.patch(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  // validator("USERS", "PATCH"),
  controller.patchById
);

router.patch(
  "/:id/activate",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  controller.activateById
);

router.patch(
  "/:id/deactivate",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  controller.deactivateById
);

router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  controller.deleteById
);

module.exports = router;
