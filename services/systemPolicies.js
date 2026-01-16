const SystemPolicy = require("../models/systemPolicies");

const getPolicy = async (type) => {
  return await SystemPolicy.findOne({ type });
};

const updatePolicy = async (type, content, userId) => {
  let policy = await SystemPolicy.findOne({ type });

  if (policy) {
    policy.content = content;
    policy.updatedBy = userId;
    policy.version += 1;
    await policy.save();
  } else {
    policy = await SystemPolicy.create({
      type,
      content,
      updatedBy: userId,
      version: 1,
    });
  }

  return policy;
};

module.exports = {
  getPolicy,
  updatePolicy,
};
