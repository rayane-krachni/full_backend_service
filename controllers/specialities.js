const service = require("../services/specialities");
const { popRandom } = require("../utils/general");
const fs = require("fs");

const get = async (req, res, next) => {
  try {
    const filter = {};
    let sort = { createdAt: -1 };

    if (req.query.filter) {
      const { belonging, isPublished, query, share, sortBy, order } = JSON.parse(
        decodeURIComponent(req.query.filter)
      );

      if (belonging) {
        filter.belonging = belonging;
      }
      if (isPublished) {
        filter.isPublished = isPublished;
      }
      if (query) { filter.name = query; }
      if (share) { filter.share = share; }
      if (sortBy) {
        sort = { [sortBy]: order === 'asc' ? 1 : -1 };
      }
    }

    let userType = req.user;
    const result = await service.find({ filter, sort }, userType);
    
    if (req.user.role == "SUPER_ADMIN") {
      res.json(result);
      return;
    }
    // Get user's language preference (default to 'fr' if not specified)
    const userLanguage = req.user?.language || 'fr';
    
    // Transform multi-language fields based on user's language
    const transformedResult = result.map(speciality => ({
      ...speciality,
      name: speciality.name?.[userLanguage] || speciality.name?.fr || speciality.name,
      description: speciality.description?.[userLanguage] || speciality.description?.fr || speciality.description
    }));
    
    res.json(transformedResult);
  } catch (error) {
    next(error);
  }
};
const getById = async (req, res, next) => {
  try {
    const user = req.user
    const result = await service.findById(req.params.id, {user});
    
    if (req.user.role == "SUPER_ADMIN") {
      res.json(result);
      return;
    }
    // Get user's language preference (default to 'fr' if not specified)
    const userLanguage = req.user?.language || 'fr';
    
    // Transform multi-language fields based on user's language
    const transformedResult = {
      ...result,
      name: result.name?.[userLanguage] || result.name?.fr || result.name,
      description: result.description?.[userLanguage] || result.description?.fr || result.description
    };
    
    res.json(transformedResult);
  } catch (error) {
    next(error);
  }
};
const create = async (req, res, next) => {
  try {
    const result = await service.create(req.body, req.user);
    if (result.message)
      res.status(400).json(result);
    else
      res.status(201).json(result);
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    if (error.message.includes('Category') || error.message.includes('choisir une catégorie')) {
      return res.status(400).json({ success: false, error: error.message });
    }

    next(error);
  }
};
const patchById = async (req, res, next) => {
  try {
    const result = await service.updateById(req.params.id, req.body, req.user?._id);
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
