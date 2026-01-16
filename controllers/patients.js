const service = require("../services/patients");

const get = async (req, res, next) => {
  try {
    const filter = req.query;
    const result = await service.find({ filter }, req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getPatientDoctors = async (req, res, next) => {
  try {
    const filter = req.query;
    const result = await service.getPatientDoctors(req.user._id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const result = await service.findById(req.params.id, req.user, {
      returnPassword: false,
      returnData: false,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  get,
  getById,
  getPatientDoctors
};
