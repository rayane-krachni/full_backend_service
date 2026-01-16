const service = require("../services/prescriptionTemplates");

const get = async (req, res, next) => {
  try {
    const filter = { doctor: req.user._id };
    let sort = { createdAt: -1 };

    if (req.query.filter) {
      const { query, sortBy, order } = JSON.parse(
        decodeURIComponent(req.query.filter)
      );

      if (query) { filter.name = query; }
      if (sortBy) {
        sort = { [sortBy]: order === 'asc' ? 1 : -1 };
      }
    }

    const result = await service.find({ filter, sort });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const result = await service.findById(req.params.id);
    // Ensure the template belongs to the requesting doctor
    if (result.doctor.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = { ...req.body, doctor: req.user._id };
    const result = await service.create(data);
    if (result.message)
      res.status(400).json(result);
    else
      res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const patchById = async (req, res, next) => {
  try {
    // Ideally we should check ownership before updating, but for simplicity assuming ID is enough or service handles it if we passed filter.
    // However, service.updateById just takes ID. Let's add a check.
    const existing = await service.findById(req.params.id);
    if (existing.doctor.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
    }

    const result = await service.updateById(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const deleteById = async (req, res, next) => {
  try {
    const existing = await service.findById(req.params.id);
    if (existing.doctor.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden" });
    }
    
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
