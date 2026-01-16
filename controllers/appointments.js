const service = require("../services/appointments");
const { popRandom } = require("../utils/general");
const fs = require("fs");
const moment = require("moment-timezone");
const get = async (req, res, next) => {
  try {
    const filter = {};
    let sort = { createdAt: -1 };
    if (req.query.filter) {
      const {
        isHomeCare,
        isRemote,
        isPresent,
        belonging,
        isPublished,
        query,
        share,
        sortBy,
        order,
        today,
      } = JSON.parse(decodeURIComponent(req.query.filter));
      if (isHomeCare) {
        filter.isHomeCare = true;
      }
      if (isRemote) {
        filter.isRemote = true;
      }
      if (isPresent) {
        filter.isPresent = true;
      }
      if (belonging) {
        filter.belonging = belonging;
      }
      if (isPublished) {
        filter.isPublished = isPublished;
      }
      if (query) {
        filter.name = query;
      }
      if (share) {
        filter.share = share;
      }
      if (sortBy) {
        sort = { [sortBy]: order === "asc" ? 1 : -1 };
      }
      if (today) {
        const algiersTime = moment().tz("Africa/Algiers");
        const todayStr = algiersTime.format("YYYY-MM-DD");

        const today = new Date(todayStr);
        filter.date = today;
      }
    }
    let userType = req.user;
    const result = await service.find({ filter, sort }, userType);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getMy = async (req, res, next) => {
  try {
    const filter = {};
    let sort = { createdAt: -1 };
    if (req.query.filter) {
      const { belonging, isPublished, query, share, sortBy, order } =
        JSON.parse(decodeURIComponent(req.query.filter));

      if (belonging) {
        filter.belonging = belonging;
      }
      if (isPublished) {
        filter.isPublished = isPublished;
      }
      if (query) {
        filter.name = query;
      }
      if (share) {
        filter.share = share;
      }
      if (sortBy) {
        sort = { [sortBy]: order === "asc" ? 1 : -1 };
      }
    }

    let userType = req.user;
    const result = await service.getMy({ filter, sort }, userType);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getTodayWaitingList = async (req, res, next) => {
  try {
    const filter = {};
    let sort = { createdAt: -1 };

    if (req.query.filter) {
      const { belonging, isPublished, query, share, sortBy, order } =
        JSON.parse(decodeURIComponent(req.query.filter));

      if (belonging) {
        filter.belonging = belonging;
      }
      if (isPublished) {
        filter.isPublished = isPublished;
      }
      if (query) {
        filter.name = query;
      }
      if (share) {
        filter.share = share;
      }
      if (sortBy) {
        sort = { [sortBy]: order === "asc" ? 1 : -1 };
      }
    }

    let userType = req.user;
    const result = await service.getDoctorQueue(
      { filter, sort },
      userType,
      req.params.id
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const result = await service.findById(req.params.id, { user: req.user });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    // Parse consultationNotes if it's a string
    if (typeof req.body.consultationNotes === "string") {
      try {
        req.body.consultationNotes = JSON.parse(req.body.consultationNotes);
      } catch (parseError) {
        req.body.consultationNotes = {};
      }
    }

    // Ensure consultationNotes is an object
    if (
      !req.body.consultationNotes ||
      typeof req.body.consultationNotes !== "object"
    ) {
      req.body.consultationNotes = {};
    }

    // If documents were uploaded, add them to consultationNotes
    if (req.body.documents && Array.isArray(req.body.documents)) {
      req.body.consultationNotes.documents = req.body.documents;
      delete req.body.documents; // Remove from top level
    }

    const result = await service.create(req.body, req.user);
    if (result.message) res.status(400).json(result);
    else res.status(201).json(result);
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    if (
      error.message.includes("Category") ||
      error.message.includes("choisir une catégorie")
    ) {
      return res.status(400).json({ success: false, error: error.message });
    }

    next(error);
  }
};

const patchById = async (req, res, next) => {
  try {
    if (req.body.consultationNotes) {
      if (typeof req.body.consultationNotes === "string") {
        try {
          req.body.consultationNotes = JSON.parse(req.body.consultationNotes);
        } catch (parseError) {
          req.body.consultationNotes = {};
        }
      }

      // Ensure consultationNotes is an object
      if (
        !req.body.consultationNotes ||
        typeof req.body.consultationNotes !== "object"
      ) {
        req.body.consultationNotes = {};
      }

      // If documents were uploaded, add them to consultationNotes
      if (req.body.documents && Array.isArray(req.body.documents)) {
        if (!req.body.consultationNotes.documents) {
          req.body.consultationNotes.documents = [];
        }
        req.body.consultationNotes.documents.push(...req.body.documents);
        delete req.body.documents; // Remove from top level
      }
    } else {
      // If documents were uploaded, add them to consultationNotes
      if (req.body.documents && Array.isArray(req.body.documents)) {
        req.body.consultationNotes = {
          documents: req.body.documents
        };
        delete req.body.documents; // Remove from top level
      }
    }

    const result = await service.updateById(req.params.id, req.body, req.user);
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

const countByStatus = async (req, res, next) => {
  try {
    let userType = req.user;
    const result = await service.countByStatus(userType);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const reorderQueue = async (req, res, next) => {
  try {
    const { appointmentIds } = req.body;
    if (!Array.isArray(appointmentIds)) throw new Error("appointmentIds must be an array");
    
    const result = await service.reorderQueue(appointmentIds, req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  get,
  getMy,
  getById,
  create,
  patchById,
  deleteById,
  getTodayWaitingList,
  countByStatus,
  reorderQueue
};
