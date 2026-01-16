const service = require("../services/favorite");
const { popRandom } = require("../utils/general");
const fs = require("fs");

const get = async (req, res, next) => {
  try {
    const filter = { isDeleted: false };
    let sort = { createdAt: -1 };
    let userType = req.user;
    const result = await service.find({ filter, sort }, userType);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
const getById = async (req, res, next) => {
  try {
    const result = await service.findById(req.params.id, req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
const create = async (req, res, next) => {
  try {
    const result = await service.create(req.body, req.user);

    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(201).json(result);
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    // For unexpected errors, return the same format
    res.status(500).json({ 
      success: false, 
      message: error.message || 'An unexpected error occurred' 
    });
  }
};
const patchById = async (req, res, next) => {
  try {
    const result = await service.updateById(req.params.id, req.body);
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
    const result = await service.deleteById(req.params.id, req.user);
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
  deleteById
};
