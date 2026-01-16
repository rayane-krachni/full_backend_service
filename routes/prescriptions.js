const express = require("express");
const router = express.Router();
const controller = require("../controllers/prescriptions");
const passport = require("passport");
const { authorize } = require("../middlewares/auth");

router.get(
    "/",
    passport.authenticate("jwt", { session: false }),
    authorize("DOCTOR", "PATIENT"),
    controller.get
);
router.get(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    authorize("DOCTOR", "PATIENT"),
    controller.getById
);
router.post(
    "/",
    passport.authenticate("jwt", { session: false }),
    authorize("DOCTOR"),
    controller.create
);

module.exports = router;
