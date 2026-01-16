const { default: mongoose } = require("mongoose");
const { RecordNotFoundError, DataValidationError } = require("../exceptions");
const Publicity = require("../models/publicity");
const { parseValidatorError } = require("../utils/mongoose");

const findById = async (_id, { returnDeleted = false } = {}) => {
  const result = await Publicity.findById(_id)
    .lean({ virtuals: true })
    .exec();
  
  if (!result || (!returnDeleted && result.isDeleted)) {
    throw new RecordNotFoundError(Publicity, "_id", _id);
  }
  
  return result;
};

const find = async (
  { 
    filter = {}, 
    sort = { createdAt: -1 },
    limit,
    skip 
  } = {}
) => {
  // Text search
  if (filter.search) {
    filter.$or = [
      { name: { $regex: filter.search, $options: "i" } },
      { link: { $regex: filter.search, $options: "i" } }
    ];
    delete filter.search;
  }

  // Active publicity filter
  if (filter.active === 'current') {
    const now = new Date();
    filter.active = true;
    filter.startDate = { $lte: now };
    filter.endDate = { $gte: now };
  }

  const query = Publicity.find({
    isDeleted: false,
    ...filter
  })
    .sort(sort)
    .lean({ virtuals: true });

  if (limit) query.limit(limit);
  if (skip) query.skip(skip);

  return query.exec();
};

const create = async (data) => {
  try {
    // Validate dates if publicity is active
    if (data.active) {
      if (!data.startDate || !data.endDate) {
        throw new DataValidationError(Publicity, "Start and end dates are required for active publicity");
      }
      if (data.startDate >= data.endDate) {
        throw new DataValidationError(Publicity, "End date must be after start date");
      }
    }

    const publicity = new Publicity(data);
    await publicity.save();
    return publicity.toObject({ virtuals: true });
    
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      throw new DataValidationError(Publicity, parseValidatorError(error));
    }
    throw error;
  }
};

const updateById = async (_id, data) => {
  try {
    // Prevent changing active status without required fields
    if (data.active !== undefined) {
      if (data.active && (!data.startDate || !data.endDate)) {
        const existing = await Publicity.findById(_id);
        if (!existing.startDate || !existing.endDate) {
          throw new DataValidationError(Publicity, "Start and end dates are required to activate publicity");
        }
      }
    }

    const result = await Publicity.findOneAndUpdate(
      { _id, isDeleted: false },
      data,
      {
        new: true,
        runValidators: true
      }
    ).lean({ virtuals: true });

    if (!result) {
      throw new RecordNotFoundError(Publicity, "_id", _id);
    }
    return result;
    
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      throw new DataValidationError(Publicity, parseValidatorError(error));
    }
    throw error;
  }
};

const toggleStatus = async (_id, active) => {
  const publicity = await Publicity.findById(_id);
  if (!publicity) {
    throw new RecordNotFoundError(Publicity, "_id", _id);
  }

  if (active && (!publicity.startDate || !publicity.endDate)) {
    throw new DataValidationError(
      Publicity, 
      "Cannot activate publicity without start and end dates"
    );
  }

  publicity.active = active;
  await publicity.save();
  return publicity.toObject({ virtuals: true });
};

const deleteById = async (_id) => {
  // Soft delete
  const result = await Publicity.findOneAndUpdate(
    { _id, isDeleted: false },
    { isDeleted: true },
    { new: true }
  ).lean();

  if (!result) {
    throw new RecordNotFoundError(Publicity, "_id", _id);
  }
  return result;
};

module.exports = {
  findById,
  find,
  create,
  updateById,
  toggleStatus,
  deleteById
};