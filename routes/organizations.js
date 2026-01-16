const express = require("express");
const router = express.Router();
const controller = require("../controllers/organizations");
const validator = require("../middlewares/validator");
const passport = require("passport");
const { handlePicture } = require("../middlewares/organizations");
const { authorize } = require("../middlewares/auth");
const path = require("path");
router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "DOCTOR"),
  controller.get
);
router.get(
  "/doctors",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "DOCTOR"),
  controller.getDoctors
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
  authorize("ADMIN", "DOCTOR"),
  handlePicture,
  // validator("CATEGORIES", "CREATE"),
  controller.create
);
router.patch(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "DOCTOR"),
  handlePicture,
  // validator("CATEGORIES", "PATCH"),
  controller.patchById
);
router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "DOCTOR"),
  controller.deleteById
);
router.post(
  "/doctor",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "DOCTOR"),
  handlePicture,
  // validator("CATEGORIES", "CREATE"),
  controller.createDoctor
);
router.delete(
  "/:id/doctor",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "DOCTOR"),
  controller.deleteDoctor
);
module.exports = router;
