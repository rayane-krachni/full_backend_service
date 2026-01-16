const express = require("express");
const router = express.Router();
const controller = require("../controllers/specialities");
const validator = require("../middlewares/validator");
const passport = require("passport");
const { handlePicture } = require("../middlewares/specialities");
const { authorize } = require("../middlewares/auth");
const path = require('path');
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
    authorize("ADMIN", "PATIENT", "DOCTOR", "NURSE"),
    handlePicture,
    // validator("CATEGORIES", "CREATE"),
    controller.create
);
router.patch(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    authorize("ADMIN", "PATIENT", "DOCTOR", "NURSE"),
    handlePicture,
    // validator("CATEGORIES", "PATCH"),
    controller.patchById
);
router.delete(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    authorize("ADMIN", "DOCTOR", "NURSE"),
    controller.deleteById
);
module.exports = router;
