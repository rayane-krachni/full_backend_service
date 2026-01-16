const express = require("express");
const router = express.Router();
const controller = require("../controllers/prescriptionTemplates");
const passport = require("passport");
const { authorize } = require("../middlewares/auth");

router.get(
    "/",
    passport.authenticate("jwt", { session: false }),
    authorize("DOCTOR"),
    controller.get
);
router.get(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    authorize("DOCTOR"),
    controller.getById
);
router.post(
    "/",
    passport.authenticate("jwt", { session: false }),
    authorize("DOCTOR"),
    controller.create
);
router.patch(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    authorize("DOCTOR"),
    controller.patchById
);
router.delete(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    authorize("DOCTOR"),
    controller.deleteById
);
module.exports = router;
