const { RecordNotFoundError } = require("../exceptions");
const adminServices = require("../services/admin");
const userServices = require("../services/user");
const { checkPassword, generateStrongPassword } = require("../utils/crypto");

const jwtHandler = async (payload, done, tokenType, target) => {
  try {
    if (tokenType !== payload.type || (target && target !== payload.target)) {
      return done(null, false);
    }
    switch (payload.target) {
      case "ADMIN": {
        const admin = await adminServices.findById(payload.sub);
        if (!admin) {
          return done(null, false);
        }
        return done(null, { ...admin, accountType: "ADMIN" });
      }
      case "PATIENT": {
        const user = await userServices.findById(payload.sub);
        if (!user) {
          return done(null, false);
        }
        return done(null, { ...user, accountType: "PATIENT" });
      }
      case "DOCTOR": {
        const user = await userServices.findById(payload.sub);
        if (!user) {
          return done(null, false);
        }
        return done(null, { ...user, accountType: "DOCTOR" });
      }
      case "EMPLOYEE": {
        const user = await userServices.findById(payload.sub);
        if (!user) {
          return done(null, false);
        }
        return done(null, { ...user, accountType: "EMPLOYEE" });
      }
      case "NURSE": {
        const user = await userServices.findById(payload.sub);
        if (!user) {
          return done(null, false);
        }
        return done(null, { ...user, accountType: "NURSE" });
      }
      // case "GUEST": {
      //   const phoneSerialCode = payload.sub;
      //   let user = await User.findOne({ phoneSerialCode });
      //   if (!user) {
      //     user = new User({ phoneSerialCode, role: 'guest', isActive: true });
      //     await user.save();
      //   }
      //   return done(null, { ...user.toObject(), accountType: "GUEST" });
      // }
      default:
        return done(null, false);
    }
  } catch (error) {
    if (error instanceof RecordNotFoundError) {
      return done(null, false);
    }
    return done(error, false);
  }
};


const localHandler = async (target, email, password, done) => {
  //  generateStrongPassword();
  try {
    switch (target) {
      case "ADMIN": {
        const admin = await adminServices.findByEmail(email, {
          returnPassword: true,
        });
        if (
          !admin ||
          !(await checkPassword(
            password,
            admin.passwordHash,
            admin.passwordSalt
          ))
        ) {
          return done(null, false);
        }
        const data = { ...admin, accountType: "ADMIN" };
        delete data.passwordHash;
        delete data.passwordSalt;
        return done(null, data);
      }
      case "USER": {    

        const user = await userServices.findByEmail(email, {
          returnPassword: true,
        });
        if (
          !user ||
          !(await checkPassword(password, user.passwordHash, user.passwordSalt))
        ) {
          return done(null, false);
        }
        // console.log(user)
        const data = { ...user, accountType: "USER" };
        delete data.passwordHash;
        delete data.passwordSalt;
        return done(null, data);
      }

      default:
        return done(null, false);
    }
  } catch (error) {
    if (error instanceof RecordNotFoundError) {
      return done(null, false);
    }
    return done(error, false);
  }
};

module.exports = {
  jwtHandler,
  localHandler,
};
