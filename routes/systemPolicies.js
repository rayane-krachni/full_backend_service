const express = require("express");
const router = express.Router();
const controller = require("../controllers/systemPolicies");
const passport = require("passport");
const { authorize } = require("../middlewares/auth");

// Public access to read policies
router.get(
  "/:type",
  controller.get
);

// Admin only access to update policies
router.put(
  "/:type",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  controller.update
);

module.exports = router;
