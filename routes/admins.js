const express = require("express");
const router = express.Router();
const controller = require("../controllers/admins");
const validator = require("../middlewares/validator");
const passport = require("passport");
const { setTokenType, authorize } = require("../middlewares/auth");

router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  controller.get
);

router.get(
  "/sos",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  controller.getSOSAlerts
);

router.get(
  "/get-me",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  controller.me
);
router.get(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  controller.getById
);

router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  validator("ADMINS", "CREATE"),
  controller.create
);

router.patch(
  "/change-password",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  validator("ADMINS", "CHANGE_PASSWORD"),
  controller.changePasswordById
);

router.patch(
  "/forgot-password",
  validator("ADMINS", "FORGOT_PASSWORD"),
  controller.forgotPassword
);

router.patch(
  "/reset-password",
  setTokenType("RESET_PASSWORD"),
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  validator("ADMINS", "RESET_PASSWORD"),
  controller.resetPassword
);

router.patch(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  validator("ADMINS", "PATCH"),
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
