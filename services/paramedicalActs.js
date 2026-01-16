const ParamedicalAct = require("../models/paramedicalActs");

const find = async ({ filter, sort }) => {
  return ParamedicalAct.find(filter).sort(sort);
};

const create = async (data) => {
  return ParamedicalAct.create(data);
};

const updateById = async (id, data) => {
  return ParamedicalAct.findByIdAndUpdate(id, data, { new: true });
};

const deleteById = async (id) => {
  return ParamedicalAct.findByIdAndDelete(id);
};

module.exports = {
  find,
  create,
  updateById,
  deleteById,
};
