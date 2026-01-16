const service = require("../services/userReports");

const ALLOWED_REASONS = ["ABUSE", "SPAM", "OTHER"];

const create = async (req, res) => {
  try {
    const { reported, reason, description } = req.body || {};

    const errors = [];

    if (!reported || (typeof reported !== "string" && typeof reported !== "number")) {
      errors.push({ field: "reported", message: "reported is required" });
    }

    if (!reason || typeof reason !== "string") {
      errors.push({ field: "reason", message: "reason is required" });
    } else {
      const up = reason.toUpperCase();
      if (!ALLOWED_REASONS.includes(up)) {
        errors.push({ field: "reason", message: `invalid reason; allowed: ${ALLOWED_REASONS.join(", ")}` });
      }
    }

    if (description !== undefined && typeof description !== "string") {
      errors.push({ field: "description", message: "description must be a string" });
    }

    if (errors.length) {
      return res.status(400).json({ errors });
    }

    const data = {
      reported,
      reason: reason.toUpperCase(),
      reporter: req.user._id, // Enforce reporter as current user
    };

    // include description only when provided
    if (description !== undefined) data.description = description;

    const report = await service.create(data);
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const list = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await service.list({}, { page, limit });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const report = await service.updateStatus(id, status);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  create,
  list,
  updateStatus,
};
