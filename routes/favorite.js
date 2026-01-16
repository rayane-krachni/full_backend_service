const express = require("express");
const router = express.Router();
const controller = require("../controllers/favorite");
const validator = require("../middlewares/validator");
const passport = require("passport");
const { authorize } = require("../middlewares/auth");
const path = require("path");
router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT"),
  controller.get
);
router.get(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT"),
  controller.getById
);
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT"),
  // validator("CATEGORIES", "CREATE"),
  controller.create
);
router.patch(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT"),
  // validator("CATEGORIES", "PATCH"),
  controller.patchById
);
router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN", "PATIENT"),
  controller.deleteById
);
module.exports = router;
