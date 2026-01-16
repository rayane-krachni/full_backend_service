const { default: mongoose } = require("mongoose");
const { RecordNotFoundError, DataValidationError } = require("../exceptions");
const Model = require("../models/service");
const { parseValidatorError } = require("../utils/mongoose");
const { User } = require("../models/user");

// Helper function to localize service fields
const localizeService = (service, userLanguage = "fr") => {
  if (!service) return service;

  const localized = { ...service };

  // Localize name
  if (typeof service.name === "object" && service.name !== null) {
    localized.name =
      service.name[userLanguage] ||
      service.name.en ||
      service.name.fr ||
      Object.values(service.name)[0];
  }

  // Localize description
  if (typeof service.description === "object" && service.description !== null) {
    localized.description =
      service.description[userLanguage] ||
      service.description.en ||
      service.description.fr ||
      Object.values(service.description)[0];
  }

  return localized;
};

const findById = async (
  _id,
  {
    returnDeleted = false,
    populateSpeciality = false,
    userId = null,
    user = null,
  } = {}
) => {
  // Get user's preferred language if userId is provided
  let userLanguage = "fr";
  if (userId) {
    const user = await User.findById(userId).select("language");
    userLanguage = user?.language || "fr";
  }

  let query = Model.findById(_id);

  if (populateSpeciality) {
    query = query.populate("speciality", "name description");
  }

  const result = await query.lean({ virtuals: true }).exec();

  if (!result || (!returnDeleted && result.isDeleted)) {
    throw new RecordNotFoundError(Model, "_id", _id);
  }

  delete result.isDeleted;
  if (user.role == "SUPER_ADMIN") {
    return result;
  }
  return localizeService(result, userLanguage);
};

const find = async (
  { filter = {}, sort = { createdAt: -1 } } = {},
  user = null,
  isFolded = false
) => {
  // Get user's preferred language if user is provided
  let userLanguage = "fr";
  if (user) {
    userLanguage = user.language || "fr";
  }
  const userFilter = {
    isDeleted: false,
    ...filter,
  };

  let query = Model.find(userFilter).sort(sort);

  if (filter.populateSpeciality) {
    query = query.populate("speciality", "name description");
  }
  let localizedServices;
  const result = await query.lean({ virtuals: true }).exec();
  if (user && user.role != "SUPER_ADMIN") {
    localizedServices = result.map((service) =>
      localizeService(service, userLanguage)
    );
  } else {
    localizedServices = result;
  }
  // Localize all services

  // If isFolded is true, group services by category
  if (isFolded) {
    const groupedServices = {};

    localizedServices.forEach((service) => {
      const category = service.category || "Uncategorized";
      if (!groupedServices[category]) {
        groupedServices[category] = {
          name: category,
          services: [],
        };
      }
      groupedServices[category].services.push(service);
    });

    return Object.values(groupedServices);
  }

  return localizedServices;
};

const create = async (data, user) => {
  try {
    // Get user's preferred language
    let userLanguage = "fr";
    if (user) {
      userLanguage = user.language || "fr";
    }

    const service = new Model(data);
    const result = await service.save();

    // Return localized result
    return localizeService(result.toObject(), userLanguage);
  } catch (error) {
    if (error.name === "ValidationError") {
      throw new DataValidationError(parseValidatorError(error));
    }
    throw error;
  }
};

const updateById = async (_id, data, userId = null) => {
  try {
    // Get user's preferred language if userId is provided
    let userLanguage = "fr";
    if (userId) {
      const user = await User.findById(userId).select("language");
      userLanguage = user?.language || "fr";
    }

    const result = await Model.findByIdAndUpdate(_id, data, {
      new: true,
      runValidators: true,
    })
      .lean({ virtuals: true })
      .exec();

    if (!result) {
      throw new RecordNotFoundError(Model, "_id", _id);
    }

    // Return localized result
    return localizeService(result, userLanguage);
  } catch (error) {
    if (error.name === "ValidationError") {
      throw new DataValidationError(parseValidatorError(error));
    }
    throw error;
  }
};

const deleteById = async (docId) => {
  const result = await Model.findByIdAndUpdate(
    docId,
    { isDeleted: true },
    { new: true }
  );
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
  localizeService,
};
