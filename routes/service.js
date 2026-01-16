const express = require("express");
const router = express.Router();
const controller = require("../controllers/service");
const validator = require("../middlewares/validator");
const passport = require("passport");
const { authorize } = require("../middlewares/auth");
const path = require("path");
router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  controller.getAll
);
router.get(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  controller.getById
);

// Create a new service (admin only)
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  controller.create
);

// Update a service (admin only)
router.patch(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  controller.update
);

// Delete a service (admin only)
router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  controller.remove
);

module.exports = router;
