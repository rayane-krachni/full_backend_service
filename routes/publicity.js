const express = require("express");
const router = express.Router();
const controller = require("../controllers/publicity");
const validator = require("../middlewares/validator");
const passport = require("passport");
const { handlePicture } = require("../middlewares/publicity");
const { authorize } = require("../middlewares/auth");
const path = require("path");
router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "DOCTOR", "NURSE", "PATIENT", "EMPLOYEE"),
  controller.get
);
router.get(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "DOCTOR", "NURSE", "PATIENT", "EMPLOYEE"),
  controller.getById
);
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  handlePicture,
  // validator("CATEGORIES", "CREATE"),
  controller.create
);
router.patch(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  handlePicture,
  // validator("CATEGORIES", "PATCH"),
  controller.patchById
);
router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  controller.deleteById
);
module.exports = router;
