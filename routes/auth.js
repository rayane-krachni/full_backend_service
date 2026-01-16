const express = require("express");
const router = express.Router();
const passport = require("passport");
const controller = require("../controllers/auth");
const middlewares = require("../middlewares/auth");

router.get(
  "/check-access-token",
  passport.authenticate("jwt", { session: false }),
  controller.checkAccessToken
);

router.post(
  "/login-admin",
  middlewares.setAuthTarget("ADMIN"),
  passport.authenticate("local", { session: false }),
  controller.loginAdmin
);

// router.post("/login", 
//   middlewares.setAuthTarget("USER"),
//   (req, res, next) => {
//     passport.authenticate("local", { session: false }, (err, user, info) => {
//       if (!user) {
//         return res.status(403).json({ 
//           message: info?.message || "Authentication failed"
//         });
//       }
//       if (!user.isActive) {
//         return res.status(403).json({ message: "Account inactive" });
//       }
//       req.user = user;
//       next();
//     })(req, res, next);
//   },
//   controller.loginUser
// );

router.post(
  "/login",
  middlewares.setAuthTarget("USER"),
  passport.authenticate("local", { session: false }),
  controller.loginUser
);

router.post(
  "/guest",
  middlewares.setAuthTarget("GUEST"),
  passport.authenticate("guest", { session: false }),
  controller.loginGuest
);

module.exports = router;
