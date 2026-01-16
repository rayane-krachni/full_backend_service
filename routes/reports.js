const express = require("express");
const router = express.Router();
const controller = require("../controllers/reports");
const passport = require("passport");
const { authorize } = require("../middlewares/auth");

// POST /api/reports - Create a report (Any authenticated user)
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  controller.create
);

// GET /api/reports - List reports (Admin only)
router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  controller.list
);

// PATCH /api/reports/:id/status - Update report status (Admin only)
router.patch(
  "/:id/status",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  controller.updateStatus
);

module.exports = router;
