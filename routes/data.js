const express = require("express");
const router = express.Router();
const controller = require("../controllers/data");
const passport = require("passport");
const { authorize } = require("../middlewares/auth");
router.get(
    "/blood",
    passport.authenticate("jwt", { session: false }),
    authorize("ADMIN", "PATIENT", "DOCTOR"),
    controller.getBlood
);
router.get(
    "/speciality",
    passport.authenticate("jwt", { session: false }),
    authorize("ADMIN", "PATIENT", "DOCTOR"),
    controller.getSpeciality
);
router.get(
    "/countries",
    passport.authenticate("jwt", { session: false }),
    authorize("ADMIN", "PATIENT", "DOCTOR"),
    controller.getCountries
);
router.get(
    "/states",
    passport.authenticate("jwt", { session: false }),
    authorize("ADMIN", "PATIENT", "DOCTOR"),
    controller.getStates
);
router.get(
    "/cities/:id",
    passport.authenticate("jwt", { session: false }),
    authorize("ADMIN", "PATIENT", "DOCTOR"),
    controller.getCities
);
router.get(
    "/business",
    passport.authenticate("jwt", { session: false }),
    authorize("ADMIN", "PATIENT", "DOCTOR"),
    controller.getBusinesses
);
router.get(
    "/availability",
    passport.authenticate("jwt", { session: false }),
    authorize("ADMIN", "PATIENT", "DOCTOR"),
    controller.getAvailabilities
);
router.get(
    "/transaction",
    passport.authenticate("jwt", { session: false }),
    authorize("ADMIN", "PATIENT", "DOCTOR"),
    controller.getTransactions
);
router.get(
    "/family",
    passport.authenticate("jwt", { session: false }),
    authorize("ADMIN", "PATIENT", "DOCTOR"),
    controller.getFamily
);
router.get(
    "/account",
    passport.authenticate("jwt", { session: false }),
    authorize("ADMIN", "PATIENT", "DOCTOR"),
    controller.getAccount
);
router.get(
    "/pre-consultation",
    passport.authenticate("jwt", { session: false }),
    authorize("ADMIN", "PATIENT", "DOCTOR"),
    controller.getPreConsultation
);
module.exports = router;