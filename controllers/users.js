const service = require("../services/user");
const { countTotalDays } = require("../utils/user");
const {
  hashPassword,
  checkPassword,
  generateStrongPassword,
  issueJWT,
} = require("../utils/crypto");
const { sendBrevoEmail, sendEmail } = require("../utils/mailing");
const Model = require("../models/user");

const getEmployees = async (req, res, next) => {
  try {
    const filter = {
      associatedDoctor: {
        $eq: req.user._id, // Must equal the doctor's ID
        $exists: true, // The field must exist
        $ne: null,
      },
      isDeleted: false,
    };
    const validRoles = ["PATIENT", "DOCTOR"];
    const validStatuses = ["active", "inactive"];

    // Role filter
    if (req.query.role) {
      const role = req.query.role.toUpperCase();
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error: "Invalid role",
          validRoles: validRoles,
        });
      }
      filter.role = role;
    }

    // Status filter
    if (req.query.status) {
      if (!validStatuses.includes(req.query.status.toLowerCase())) {
        return res.status(400).json({
          error: "Invalid status",
          validStatuses: validStatuses,
        });
      }
      filter.isActive = req.query.status.toLowerCase() === "active";
    }

    // Search filter
    if (req.query.search) {
      filter.$or = [
        { fullName: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
        { phone: { $regex: req.query.search, $options: "i" } },
      ];
    }

    // Date range filter
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) {
        filter.createdAt.$gte = new Date(req.query.dateFrom);
      }
      if (req.query.dateTo) {
        filter.createdAt.$lte = new Date(req.query.dateTo);
      }
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const result = await service.findEmployees(
      {
        filter,
        pagination: { skip, limit },
      },
      req.user
    );
    res.json({
      data: result.users,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};
const get = async (req, res, next) => {
  try {
    const filter = {};
    const validRoles = ["PATIENT", "DOCTOR"];
    const validStatuses = ["active", "inactive"];

    // Role filter
    if (req.query.role) {
      const role = req.query.role.toUpperCase();
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error: "Invalid role",
          validRoles: validRoles,
        });
      }
      filter.role = role;
    }

    // Status filter
    if (req.query.status) {
      if (!validStatuses.includes(req.query.status.toLowerCase())) {
        return res.status(400).json({
          error: "Invalid status",
          validStatuses: validStatuses,
        });
      }
      filter.isActive = req.query.status.toLowerCase() === "active";
    }

    // Search filter
    if (req.query.search) {
      filter.$or = [
        { fullName: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
        { phone: { $regex: req.query.search, $options: "i" } },
      ];
    }

    // Date range filter
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) {
        filter.createdAt.$gte = new Date(req.query.dateFrom);
      }
      if (req.query.dateTo) {
        filter.createdAt.$lte = new Date(req.query.dateTo);
      }
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const result = await service.find(
      {
        filter,
        pagination: { skip, limit },
      },
      req.user
    );

    res.json({
      data: result.users,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const result = await service.me(req.user._id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getFamilyMembers = async (req, res, next) => {
  try {
    const result = await service.getFamilyMembers(req.user._id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
const getById = async (req, res, next) => {
  try {
    const result = await service.findById(req.params.id, {
      returnPassword: false,
      returnData: false,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  // try {
  const { passwordHash, passwordSalt } = await hashPassword(req.data.password);
  delete req.data.password;

  // Create the new account
  const result = await service.create({
    ...req.data,
    passwordHash,
    passwordSalt,
    picture: `${req.protocol}://${req.get(
      "host"
    )}/data/static/public/users/default.webp`,
  });

  const pin = await service.generatePin(req.data.email, "account");
  sendEmail(
    result.email,
    "Nouveau Compte Créé",
    `<h3>Bienvenue sur Sahti</h3><br>Votre compte a été bien créé. <br> Utiliser ce PIN <i>"${pin.account_pin}"</i> pour confirmer votre email.`
  );

  res.status(201).json(result);
  // } catch (error) {
  //   const status = error.status || 500;
  //   const message = error.message || "Internal Server Error";
  //   const details = error.details || null;

  //   res.status(status).json({
  //     success: false,
  //     message,
  //     details,
  //   });
  // }
};
const resend = async (req, res, next) => {
  try {
    const pin = await service.generatePin(req.data.email, "account");
    sendEmail(
      req.data.email,
      "Nouveau Compte Créé",
      `<h3>Bienvenue sur Suivi de vente</h3><br>Votre compte a été bien créé. <br> Utiliser ce PIN <i>"${pin.account_pin}"</i> pour confirmer votre email.`
    );

    res.status(201).json({ message: "Email sent" });
  } catch (error) {
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    const details = error.details || null;

    res.status(status).json({
      success: false,
      message,
      details,
    });
  }
};
const patchById = async (req, res, next) => {
  try {
    if (req.body.password) {
      const { passwordHash, passwordSalt } = await hashPassword(
        req.body.password
      );
      req.body.passwordHash = passwordHash
      req.body.passwordSalt = passwordSalt
    } else {
      delete req.body.password;
    }
    const result = await service.updateById(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
const updateProfile = async (req, res, next) => {
  try {
    const result = await service.updateById(req.user._id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
const setupProfile = async (req, res, next) => {
  try {
    const result = await service.setupProfile(req, req.body);
    console.log(result)
    // Check if the service returned an error response
    if (result && result.success === false) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
};
const activateAccount = async (req, res, next) => {
  try {
    // console.log(req.body)
    const user = await service.findById(req.body.id, {
      returnPassword: false,
    });
    const result = await service.activateAccount(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
const changePasswordById = async (req, res, next) => {
  try {
    const user = await service.findById(req.user._id, {
      returnPassword: true,
    });
    const check = await checkPassword(
      req.data.oldPassword,
      user.passwordHash,
      user.passwordSalt
    );
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
    const result = await service.findByEmail(req.body.email);
    if (!result)
      res.status(404).json({
        success: false,
        message: "E-mail not found.",
      });
    const pin = await service.generatePin(req.body.email, "password");
    const maxAge = process.env.DEFAULT_RESET_PASSWORD_TOKEN_AGE || 3600;
    const token = await issueJWT(result._id, {
      type: "RESET_PASSWORD",
      target: "USER",
      maxAge: parseInt(maxAge),
    });
    sendEmail(
      result.email,
      "Mot de passe oublié",
      `<h3>Bienvenue sur My Spiritual Candle<br></h3>Veuillez utiliser le PIN <i>"${pin.password_pin}"</i> pour réinitialiser votre mot de passe.<br>Ce lien s'expire dans 20 minutes !`
    );
    res.status(200).json({
      success: true,
      message: "E-mail enjoyer avec succès.",
      token: token,
    });
    // res.status(201).json(result);
  } catch (error) {
    console.log(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { passwordHash, passwordSalt } = await hashPassword(
      req.body.newPassword
    );
    // console.log(req.user);
    await service.updatePasswordById(req.user._id, req.body, {
      passwordHash,
      passwordSalt,
      password_pin: 0,
    });
    res.status(200).json({
      success: true,
      message: "Le mot de passe a été modifier avec succès.",
    });
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
    const result = await service.deleteById(req.params.id, req.user._id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getCalender = async (req, res, next) => {
  try {
    const filter = {};
    const result = await service.getDoctorCalendar(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Family

// Edit family member
const updateEmployee = async (req, res, next) => {
  try {
    if (req.body.password) {
      const { passwordHash, passwordSalt } = await hashPassword(
        req.body.password
      );
      delete req.body.password;
      req.body.passwordHash = passwordHash;
      req.body.passwordSalt = passwordSalt;
    }
    const result = await service.updateById(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
const createFamily = async (req, res, next) => {
  // try {
  const { passwordHash, passwordSalt } = await hashPassword("password");
  // delete req.data.password;

  const result = await service.create({
    ...req.data,
    passwordHash,
    passwordSalt,
    responsibleId: req.user._id,
    isFamilyAccount: false,
    role: "PATIENT",
    picture: `${req.protocol}://${req.get(
      "host"
    )}/data/static/public/users/default.webp`,
  });
  if (req.user?._id) {
    await service.updateById(req.user?.id, { isFamilyAccount: true });
    // await Model.User.findByIdAndUpdate(
    //   req.user._id,
    //   { $set: { isFamilyAccount: true } },
    //   { new: true }
    // );
  }

  res.status(201).json(result);
  // } catch (error) {
  //   const status = error.status || 500;
  //   const message = error.message || "Internal Server Error";
  //   const details = error.details || null;

  //   res.status(status).json({
  //     success: false,
  //     message,
  //     details,
  //   });
  // }
};
const editFamilyMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.data;

    const updatedMember = await service.editFamilyMember(
      req.user._id,
      id,
      updateData
    );

    res.status(200).json(updatedMember);
  } catch (error) {
    next(error);
  }
};

const deleteFamilyMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const creatorId = req.user._id;

    // 1. Delete the family member
    const result = await service.deleteFamilyMember(creatorId, id);

    // 2. Check if creator has any remaining family members
    const creator = await Model.User.findById(creatorId);
    if (!creator) {
      throw new Error("Creator account not found");
    }

    // 3. Update isFamilyAccount if no more family members
    if (creator.familyMembers && creator.familyMembers.length === 0) {
      await Model.User.findByIdAndUpdate(
        creatorId,
        { $set: { isFamilyAccount: false } },
        { new: true }
      );
    }

    res.status(200).json({
      ...result,
      isFamilyAccountUpdated: creator.familyMembers?.length === 0,
    });
  } catch (error) {
    next(error);
  }
};

// Employee

const createEmployee = async (req, res, next) => {
  // try {
  const { passwordHash, passwordSalt } = await hashPassword(req.data.password);
  const result = await service.create({
    ...req.data,
    passwordHash,
    passwordSalt,
    isActive: true,
    associatedDoctor: req.user._id,
    role: "EMPLOYEE",
    picture: `${req.protocol}://${req.get(
      "host"
    )}/data/static/public/users/default.webp`,
  });
  if (result.id) {
    res.status(201).json(result);
  } else res.status(400).json(result);
};
// const editEmployee = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const updateData = req.data;

//     const updatedEmployee = await service.editEmployee(
//       req.user._id,
//       id,
//       updateData
//     );

//     res.status(200).json(updatedEmployee);
//   } catch (error) {
//     next(error);
//   }
// };

// const deleteEmployee = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const creatorId = req.user._id;

//     // 1. Delete the family member
//     const result = await service.deleteEmployee(creatorId, id);

//     // 2. Check if creator has any remaining family members
//     const creator = await Model.User.findById(creatorId);
//     if (!creator) {
//       throw new Error("Creator account not found");
//     }
//     res.status(200).json({
//       ...result,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

module.exports = {
  get,
  getById,
  create,
  createFamily,
  patchById,
  changePasswordById,
  forgotPassword,
  resetPassword,
  activateById,
  deactivateById,
  deleteById,
  activateAccount,
  me,
  updateProfile,
  setupProfile,
  updateEmployee,
  me,
  resend,
  editFamilyMember,
  getFamilyMembers,
  deleteFamilyMember,
  getCalender,
  createEmployee,
  getEmployees,
  // deleteEmployee
};
