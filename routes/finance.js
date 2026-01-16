
const express = require("express");
const router = express.Router();
const controller = require("../controllers/finance");
const passport = require("passport");
const { authorize } = require("../middlewares/auth");

router.get(
    "/my-balance",
    passport.authenticate("jwt", { session: false }),
    authorize("ADMIN", "PATIENT", "DOCTOR", "NURSE"),
    controller.getMyBalance
);
router.post(
    "/balance/update/:doctorId",
    passport.authenticate("jwt", { session: false }),
    authorize("ADMIN", "DOCTOR", "NURSE"),
    controller.updateBalance
);
router.get(
    "/balances",
    passport.authenticate("jwt", { session: false }),
    authorize("ADMIN", "DOCTOR", "NURSE"),
    controller.listBalances
);
module.exports = router;
