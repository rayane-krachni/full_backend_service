const service = require("../services/paramedicalActs");

const get = async (req, res, next) => {
  try {
    const filter = {};
    let sort = { name: 1 };
    
    if (req.query.filter) {
        try {
           const queryParams = JSON.parse(decodeURIComponent(req.query.filter));
           if (queryParams.query) {
               filter.name = { $regex: queryParams.query, $options: "i" };
           }
        } catch (e) {
           // ignore
        }
    }

    const result = await service.find({ filter, sort });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const result = await service.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const updateById = async (req, res, next) => {
    try {
        const result = await service.updateById(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        next(error);
    }
}

const deleteById = async (req, res, next) => {
    try {
        const result = await service.deleteById(req.params.id);
        res.json(result);
    } catch (error) {
        next(error);
    }
}

module.exports = {
  get,
  create,
  updateById,
  deleteById
};
