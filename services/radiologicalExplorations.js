const RadiologicalExploration = require("../models/radiologicalExplorations");

const find = async ({ filter, sort }) => {
  return RadiologicalExploration.find(filter).sort(sort);
};

const create = async (data) => {
  return RadiologicalExploration.create(data);
};

const updateById = async (id, data) => {
  return RadiologicalExploration.findByIdAndUpdate(id, data, { new: true });
};

const deleteById = async (id) => {
  return RadiologicalExploration.findByIdAndDelete(id);
};

module.exports = {
  find,
  create,
  updateById,
  deleteById,
};
