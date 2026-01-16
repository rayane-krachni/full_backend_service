const service = require("../services/systemPolicies");

const get = async (req, res, next) => {
  try {
    const { type } = req.params;
    const policy = await service.getPolicy(type.toUpperCase());
    if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
    }
    res.json(policy);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { content } = req.body;
    
    if (!content) {
        return res.status(400).json({ message: "Content is required" });
    }

    const policy = await service.updatePolicy(
      type.toUpperCase(),
      content,
      req.user._id
    );
    res.json(policy);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  get,
  update,
};
