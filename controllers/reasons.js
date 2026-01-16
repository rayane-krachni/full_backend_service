const service = require("../services/reasons");
const { popRandom } = require("../utils/general");
const fs = require("fs");

const get = async (req, res, next) => {
  try {
    const filter = { isDeleted: false };
    let sort = { createdAt: -1 };

    if (req.query.filter) {
      const { belonging, isPublished, query, sortBy, order, speciality } =
        JSON.parse(decodeURIComponent(req.query.filter));

      if (belonging) {
        filter.belonging = belonging;
      }
      if (isPublished) {
        filter.isPublished = isPublished;
      }
      if (query) {
        filter.name = { $regex: query, $options: "i" };
      }
      if (speciality) {
        filter.speciality = speciality;
      }
      if (sortBy) {
        sort = { [sortBy]: order === "asc" ? 1 : -1 };
      }
    }

    let userType = req.user;
    const result = await service.find({ filter, sort }, userType);
    if (req.user.role == "SUPER_ADMIN") {
      res.json(result);
      return;
    }

    // Get user's language preference (default to 'fr' if not specified)
    const userLanguage = req.user?.language || "fr";

    // Transform multi-language fields based on user's language
    const transformedResult = result.map((reason) => ({
      ...reason,
      name: reason.name?.[userLanguage] || reason.name?.fr || reason.name,
      description:
        reason.description?.[userLanguage] ||
        reason.description?.fr ||
        reason.description,
      speciality: reason.speciality
        ? {
            ...reason.speciality,
            name:
              reason.speciality.name?.[userLanguage] ||
              reason.speciality.name?.fr ||
              reason.speciality.name,
          }
        : reason.speciality,
    }));

    res.json(transformedResult);
  } catch (error) {
    next(error);
  }
};
const getById = async (req, res, next) => {
  try {
    const user = req.user;
    const result = await service.findById(req.params.id, { user });

    // Get user's language preference (default to 'fr' if not specified)
    const userLanguage = req.user?.language || "fr";
    if (req.user.role == "SUPER_ADMIN") {
      res.json(result);
      return;
    }

    // Transform multi-language fields based on user's language
    const transformedResult = {
      ...result,
      name: result.name?.[userLanguage] || result.name?.fr || result.name,
      description:
        result.description?.[userLanguage] ||
        result.description?.fr ||
        result.description,
      speciality: result.speciality
        ? {
            ...result.speciality,
            name:
              result.speciality.name?.[userLanguage] ||
              result.speciality.name?.fr ||
              result.speciality.name,
          }
        : result.speciality,
    };
    res.json(transformedResult);
  } catch (error) {
    next(error);
  }
};
const create = async (req, res, next) => {
  try {
    const result = await service.create(req.body, req.user);
    if (result.message) res.status(400).json(result);
    else res.status(201).json(result);
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    next(error);
  }
};
const patchById = async (req, res, next) => {
  try {
    const result = await service.updateById(
      req.params.id,
      req.body,
      req.user?._id
    );
    res.json(result);
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
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

module.exports = {
  get,
  getById,
  create,
  patchById,
  deleteById,
};
