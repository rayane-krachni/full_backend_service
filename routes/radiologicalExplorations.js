const express = require("express");
const controller = require("../controllers/radiologicalExplorations");
const { authorize } = require("../middlewares/auth");
const passport = require("passport");

const router = express.Router();

router.get("/", passport.authenticate("jwt", { session: false }), controller.get);
router.post("/", passport.authenticate("jwt", { session: false }), authorize(["ADMIN", "DOCTOR"]), controller.create);
router.patch("/:id", passport.authenticate("jwt", { session: false }), authorize(["ADMIN", "DOCTOR"]), controller.updateById);
router.delete("/:id", passport.authenticate("jwt", { session: false }), authorize(["ADMIN", "DOCTOR"]), controller.deleteById);

module.exports = router;
