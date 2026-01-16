const service = require("../services/maladies");

const get = async (req, res, next) => {
  try {
    const filter = {};
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
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const result = await service.create(req.body);
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
    const result = await service.updateById(req.params.id, req.body);
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

module.exports = {
  get,
  getById,
  create,
  patchById,
  deleteById,
};
