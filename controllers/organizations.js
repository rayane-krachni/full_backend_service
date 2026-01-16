const service = require("../services/organizations");
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
    if (userType.role === "DOCTOR") filter.adminDoctor = req.user._id;
    const result = await service.find({ filter, sort }, userType);
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
    const result = await service.create(req.body, req.user);
    console.log(result);
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
    const result = await service.deleteById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const createDoctor = async (req, res, next) => {
  try {
    const result = await service.createDoctor(req.body, req.user);
    if (result.message) {
      // If there's a message, it's considered a client error
      res.status(400).json(result);
    } else {
      res.status(201).json(result);
    }
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    // Handle validation errors with 403 status
    if (error.error === "ValidationError") {
      return res.status(403).json({
        error: error.error,
        message: error.message
      });
    }

    // Pass other errors to the error handler middleware
    next(error);
  }
};
const deleteDoctor = async (req, res, next) => {
  try {
    const result = await service.deleteDoctor(req.params.id, req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
const getDoctors = async (req, res, next) => {
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
    const result = await service.getOrganizationDoctors(userType);
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
  createDoctor,
  deleteDoctor,
  getDoctors
};
