const service = require("../services/admin");
const sosServices = require("../services/sosAlerts");
const {
  hashPassword,
  checkPassword,
  generateStrongPassword,
  issueJWT,
} = require("../utils/crypto");
const { sendEmail } = require("../utils/mailing");

const get = async (req, res, next) => {
  try {
    const result = await service.find({});
    res.json(result);
  } catch (error) {
    next(error);
  }
};
const me = async (req, res, next) => {
  try {
    const filter = req.query;
    const result = await service.findById(req.user._id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
const getById = async (req, res, next) => {
  try {
    const result = await service.findById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { password, passwordHash, passwordSalt } =
      await generateStrongPassword();
    const result = await service.create({
      ...req.data,
      passwordHash,
      passwordSalt,
    });
    // sendEmail(
    //   result.email,
    //   "Nouveau Compte Créé",
    //   `<h3>Bienvenue sur Orthographe Plus<br></h3>Veuillez utiliser les informations d'identification suivantes pour accéder à <a href="${process.env.BACK_OFFICE_URL}" target="_blank">votre tableau de bord</a><ul><li><b>Email:</b> ${result.email}</li><li><b>Password:</b> ${password}</li></ul>Vous Pouvez modifier votre mot de passe après la connexion !`
    // );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const patchById = async (req, res, next) => {
  try {
    const result = await service.updateById(req.params.id, req.data);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const changePasswordById = async (req, res, next) => {
  try {
    const admin = await service.findById(req.user._id, {
      returnPassword: true,
    });
    const check = await checkPassword(
      req.data.oldPassword,
      admin.passwordHash,
      admin.passwordSalt
    );
    if (!check) {
      res.sendStatus(401);
      return;
    }
    const { passwordHash, passwordSalt } = await hashPassword(
      req.data.newPassword
    );
    const result = await service.updateById(req.user._id, {
      passwordHash,
      passwordSalt,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const result = await service.findByEmail(req.data.email);
    const maxAge = process.env.DEFAULT_RESET_PASSWORD_TOKEN_AGE || 3600;
    const token = await issueJWT(result._id, {
      type: "RESET_PASSWORD",
      target: "ADMIN",
      maxAge: parseInt(maxAge),
    });
    sendEmail(
      req.data.email,
      "Mot de passe oublié",
      `<h3>Bienvenue sur Orthographe Plus<br></h3>Veuillez visitez <a href="${process.env.BACK_OFFICE_URL}/reset-password?token=${token}">ce lien</a> pour réinitialiser votre mot de passe.<br>Ce lien s'expire dans 20 minutes !`
    );
  } catch (error) {
    console.log(error);
  } finally {
    res.sendStatus(200);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { passwordHash, passwordSalt } = await hashPassword(
      req.data.newPassword
    );
    await service.updateById(req.user._id, {
      passwordHash,
      passwordSalt,
    });
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
};

const activateById = async (req, res, next) => {
  try {
    const result = await service.activateById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const deactivateById = async (req, res, next) => {
  try {
    const result = await service.deactivateById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const deleteById = async (req, res, next) => {
  try {
    const result = await service.deleteById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getSOSAlerts = async (req, res, next) => {
    try {
        const alerts = await sosServices.list({}, req.query);
        res.json(alerts);
    } catch (error) {
        next(error);
    }
};

module.exports = {
  get,
  getById,
  create,
  patchById,
  changePasswordById,
  forgotPassword,
  resetPassword,
  activateById,
  deactivateById,
  deleteById,
  me,
  getSOSAlerts
};
