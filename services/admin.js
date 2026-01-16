const { default: mongoose } = require("mongoose");
const { RecordNotFoundError, DataValidationError } = require("../exceptions");
const Model = require("../models/admin");
const { parseValidatorError } = require("../utils/mongoose");

const findById = async (_id, { returnPassword = false } = {}) => {
  const result = await Model.findById(_id, {
    ...(returnPassword ? {} : { passwordHash: 0, passwordSalt: 0 }),
  })
    .lean({ virtuals: true })
    .exec();
  if (!result || result.isDeleted) {
    throw new RecordNotFoundError(Model, "_id", _id);
  }
  delete result.isDeleted;
  return result;
};

const findByEmail = async (email, { returnPassword = false } = {}) => {
  const result = await Model.findOne(
    { isDeleted: false, email },
    {
      isDeleted: 0,
      ...(returnPassword ? {} : { passwordHash: 0, passwordSalt: 0 }),
    }
  )
    .lean({ virtuals: true })
    .exec();
  if (!result) {
    throw new RecordNotFoundError(Model, "email", email);
  }
  return result;
};

const find = async ({ filter = {} } = {}) => {
  const result = await Model.find(
    { isDeleted: false, ...filter },
    {
      isDeleted: 0,
      passwordHash: 0,
      passwordSalt: 0,
    }
  )
    .lean({ virtuals: true })
    .exec();
  return result;
};

const create = async (data) => {
  try {
    const result = new Model(data);
    await result.save();
    return result.toObject({
      virtuals: true,
      transform: (doc, ret, options) => {
        delete ret.isDeleted;
        delete ret.passwordHash;
        delete ret.passwordSalt;
        return ret;
      },
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      throw new DataValidationError(Model, parseValidatorError(error));
    } else {
      throw error;
    }
  }
};

const updateById = async (_id, data) => {
  try {
    const result = await Model.findOneAndUpdate(
      { _id, isDeleted: false },
      data,
      {
        new: true,
        runValidators: true,
        fields: { isDeleted: 0, passwordHash: 0, passwordSalt: 0 },
      }
    ).lean({ virtuals: true });
    if (!result) {
      throw new RecordNotFoundError(Model, "_id", _id);
    }
    return result;
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      throw new DataValidationError(Model, parseValidatorError(error));
    } else {
      throw error;
    }
  }
};

const activateById = async (_id) => {
  const result = await Model.findOneAndUpdate(
    { _id, isDeleted: false, isActive: false },
    { isActive: true },
    {
      new: true,
      runValidators: true,
      fields: { isDeleted: 0, passwordHash: 0, passwordSalt: 0 },
    }
  ).lean({ virtuals: true });
  if (!result) {
    throw new RecordNotFoundError(Model, "_id", _id);
  }
  return result;
};

const deactivateById = async (_id) => {
  const result = await Model.findOneAndUpdate(
    { _id, isDeleted: false, isActive: true },
    { isActive: false },
    {
      new: true,
      runValidators: true,
      fields: { isDeleted: 0, passwordHash: 0, passwordSalt: 0 },
    }
  ).lean({ virtuals: true });
  if (!result) {
    throw new RecordNotFoundError(Model, "_id", _id);
  }
  return result;
};

const deleteById = async (_id) => {
  const result = await Model.findOneAndUpdate(
    { _id, isDeleted: false },
    { isDeleted: true },
    {
      new: true,
      runValidators: true,
      fields: { isDeleted: 0, passwordHash: 0, passwordSalt: 0 },
    }
  ).lean({ virtuals: true });
  if (!result) {
    throw new RecordNotFoundError(Model, "_id", _id);
  }
  return result;
};

module.exports = {
  findById,
  findByEmail,
  find,
  create,
  updateById,
  activateById,
  deactivateById,
  deleteById,
};
