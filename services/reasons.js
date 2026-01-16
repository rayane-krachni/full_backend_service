const { default: mongoose } = require("mongoose");
const { RecordNotFoundError, DataValidationError } = require("../exceptions");
const Model = require("../models/reasons");
const { parseValidatorError } = require("../utils/mongoose");
const { User } = require("../models/user");

// Helper function to localize reason fields based on user's language
const localizeReason = (reason, language = "fr") => {
  if (!reason) return reason;

  const localized = { ...reason };

  // Localize name field
  if (reason.name && typeof reason.name === "object") {
    localized.name =
      reason.name[language] || reason.name.en || Object.values(reason.name)[0];
  }

  // Localize description field
  if (reason.description && typeof reason.description === "object") {
    localized.description =
      reason.description[language] ||
      reason.description.en ||
      Object.values(reason.description)[0];
  }

  // Localize populated speciality field
  if (
    reason.speciality &&
    reason.speciality.name &&
    typeof reason.speciality.name === "object"
  ) {
    localized.speciality = { ...reason.speciality };
    localized.speciality.name =
      reason.speciality.name[language] ||
      reason.speciality.name.en ||
      Object.values(reason.speciality.name)[0];
  }

  return localized;
};

const findById = async (
  _id,
  {
    returnDeleted = false,
    populateCategory = false,
    userId = null,
    user = null,
  } = {}
) => {
  const result = await Model.findById(_id)
    .populate({ path: "speciality", select: "name" })
    .lean({ virtuals: true })
    .exec();
  if (!result || (!returnDeleted && result.isDeleted)) {
    throw new RecordNotFoundError(Model, "_id", _id);
  }
  delete result.isDeleted;
  if (user.role == "SUPER_ADMIN") {
    console.log(result);
    return result;
  }
  // Get user's preferred language and localize the result
  let userLanguage = "fr";
  if (userId) {
    const user = await User.findById(userId).select("language").lean();
    userLanguage = user?.language || "fr";
  }

  return localizeReason(result, userLanguage);
};

const find = async (
  { filter = {}, sort = { createdAt: -1 } } = {},
  user = null
) => {
  // Get user's preferred language
  let userLanguage = "fr";
  if (user && user._id) {
    const userData = await User.findById(user._id).select("language").lean();
    userLanguage = userData?.language || "fr";
  }
  if (filter.name) {
    filter.$or = [
      { "name.en": { $regex: filter.name, $options: "i" } },
      { "name.ar": { $regex: filter.name, $options: "i" } },
      { "name.fr": { $regex: filter.name, $options: "i" } },
      { ref: { $regex: filter.name, $options: "i" } },
    ];
    delete filter.name;
  }

  const result = await Model.find({
    isDeleted: false,
    ...filter,
  })
    .populate({ path: "speciality", select: "name" })
    .sort(sort)
    .lean({ virtuals: true })
    .exec();

  if (filter.share && result) {
    const link = await generateExcel(result);
    return { url: link };
  }
  if (user.role == "SUPER_ADMIN") {
    return result;
  }

  // Localize all results
  const localizedResults = result.map((reason) =>
    localizeReason(reason, userLanguage)
  );
  return localizedResults;
};

const create = async (data, user) => {
  try {
    console.log(data);
    const result = new Model(data);
    await result.save();
    const resultObj = result.toObject({
      virtuals: true,
      transform: (doc, ret, options) => {
        delete ret.isDeleted;
        return ret;
      },
    });

    // Get user's preferred language and localize the result
    let userLanguage = "fr";
    if (user && user._id) {
      const userData = await User.findById(user._id).select("language").lean();
      userLanguage = userData?.language || "fr";
    }

    return localizeReason(resultObj, userLanguage);
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return {
        error: "ValidationError",
        message: parseValidatorError(error),
      };
    } else {
      return { success: false, message: error.message };
    }
  }
};

const updateById = async (_id, data, userId = null) => {
  try {
    const result = await Model.findOneAndUpdate(
      { _id, isDeleted: false },
      data,
      {
        new: true,
        runValidators: true,
        fields: { isDeleted: 0 },
      }
    ).lean({ virtuals: true });
    if (!result) {
      throw new RecordNotFoundError(Model, "_id", _id);
    }

    // Get user's preferred language and localize the result
    let userLanguage = "fr";
    if (userId) {
      const userData = await User.findById(userId).select("language").lean();
      userLanguage = userData?.language || "fr";
    }

    return localizeReason(result, userLanguage);
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      throw new DataValidationError(Model, parseValidatorError(error));
    } else {
      throw error;
    }
  }
};
const deleteById = async (docId) => {
  const result = await Model.findByIdAndDelete(docId).lean();

  if (!result) {
    throw new RecordNotFoundError(Model, "_id", docId);
  }

  return result;
};

module.exports = {
  findById,
  find,
  create,
  updateById,
  deleteById,
};
