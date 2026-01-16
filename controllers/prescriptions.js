const service = require("../services/prescriptions");

const get = async (req, res, next) => {
  try {
    const filter = {};
    let sort = { createdAt: -1 };

    // Role-based filtering
    if (req.user.role === 'DOCTOR') {
        filter.doctor = req.user._id;
    } else if (req.user.role === 'PATIENT') {
        filter.patient = req.user._id;
    }

    if (req.query.filter) {
      const { query, sortBy, order } = JSON.parse(
        decodeURIComponent(req.query.filter)
      );
      // Add custom query filters if needed
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
    
    // Access control
    const userId = req.user._id.toString();
    if (result.doctor._id.toString() !== userId && result.patient._id.toString() !== userId) {
        // Allow if admin or other roles? For now strict.
        // Actually, let's just check if they are related.
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

module.exports = {
  get,
  getById,
  create
};
