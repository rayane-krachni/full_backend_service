const express = require("express");
const router = express.Router();
const controller = require("../controllers/maladies");
const passport = require("passport");
const { authorize } = require("../middlewares/auth");

router.get(
    "/",
    passport.authenticate("jwt", { session: false }),
    authorize("ADMIN", "PATIENT", "DOCTOR", "NURSE"),
    controller.get
);
router.get(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    authorize("ADMIN", "PATIENT", "DOCTOR", "NURSE"),
    controller.getById
);
router.post(
    "/",
    passport.authenticate("jwt", { session: false }),
    authorize("ADMIN", "DOCTOR", "NURSE"),
    controller.create
);
router.patch(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    authorize("ADMIN", "DOCTOR", "NURSE"),
    controller.patchById
);
router.delete(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    authorize("ADMIN", "DOCTOR", "NURSE"),
    controller.deleteById
);
module.exports = router;
