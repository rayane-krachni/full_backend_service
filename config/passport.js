const JwtStrategy = require("passport-jwt").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const passport = require("passport");
const { getPubKey } = require("../utils/crypto");
const { localHandler, jwtHandler } = require("./passportHandlers");
const User = require('../models/user');

const PUB_KEY = getPubKey();
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  passReqToCallback: true,
  secretOrKey: PUB_KEY,
  algorithms: ["RS256"],
  ignoreExpiration: false,
  jsonWebTokenOptions: {
    maxAge: "1d",
  },
};

passport.use(new JwtStrategy(jwtOptions, async (req, jwtPayload, done) => {
  req.jwtPayload = jwtPayload;
  return await jwtHandler(jwtPayload, done, req.tokenType ?? "ACCESS_TOKEN", req.authTarget);
}));
passport.use('guest', new LocalStrategy(
  { usernameField: 'phoneSerialCode', passwordField: 'phoneSerialCode' },
  async (phoneSerialCode, _, done) => {
    try {
      let user = await User.findOne({ phoneSerialCode });

      if (!user) {
        user = new User({ phoneSerialCode, role: 'guest', isActive: true });
        await user.save();
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

const localOptions = { passReqToCallback: true, usernameField: "email" };
passport.use(new LocalStrategy(localOptions, async (req, email, password, done) => {
  return await localHandler(req.authTarget, email, password, done);
}));




passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
