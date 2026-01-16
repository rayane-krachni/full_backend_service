const base64 = require("base-64");
const errorHandler = require("../middlewares/errorHandler");
const express = require("express");
const passport = require("passport");
const path = require("node:path");
const router = express.Router();

router.use(
  "/static/public",
  express.static(path.join(process.cwd(), "data", "static", "public"))
);
router.use(
  "/static/private",
  (req, res, next) => {
    try {
      req.headers["authorization"] = base64.decode(req.query.token);
    } catch (error) {}
    next();
  },
  passport.authenticate("jwt", { session: false }),
  express.static(path.join(process.cwd(), "data", "static", "private"))
);
router.use(
  "/excels",
  express.static(path.join(process.cwd(), "data", "excels"))
);

router.use(
  "/static/internal/public",
  express.static(path.join(process.cwd(), "static", "public"))
);
router.use(
  "/static/internal/private",
  (req, res, next) => {
    try {
      req.headers["authorization"] = base64.decode(req.query.token);
    } catch (error) {}
    next();
  },
  passport.authenticate("jwt", { session: false }),
  express.static(path.join(process.cwd(), "static", "private"))
);

router.use("/auth", require("./auth"));
router.use("/admins", require("./admins"));
router.use("/users", require("./users"));
router.use("/doctors", require("./doctors"));
router.use("/patients", require("./patients"));
router.use("/specialities", require("./specialities"));
router.use("/appointments", require("./appointments"));
router.use("/messages", require("./messages"));
router.use("/reasons", require("./reasons"));
router.use("/data", require("./data"));
router.use("/home-care", require("./homeCare"));
router.use("/organizations", require("./organizations"));
router.use("/publicity", require("./publicity"));
router.use("/favorite", require("./favorite"));
router.use("/transactions", require("./transaction"));
router.use("/services", require("./service"));
router.use("/notifications", require("./notifications"));
router.use("/medicaments", require("./medicaments"));
router.use("/maladies", require("./maladies"));
router.use("/prescription-templates", require("./prescriptionTemplates"));
router.use("/prescriptions", require("./prescriptions"));
router.use("/certificates", require("./certificates"));
router.use("/system-policies", require("./systemPolicies"));
router.use("/reports", require("./reports"));
router.use("/radiological-explorations", require("./radiologicalExplorations"));
router.use("/paramedical-acts", require("./paramedicalActs"));
router.use("/finance", require("./finance"));
router.use(errorHandler);

module.exports = router;
