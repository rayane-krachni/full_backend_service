const { default: mongoose } = require("mongoose");
const { RecordNotFoundError, DataValidationError } = require("../exceptions");
const Model = require("../models/prescriptionTemplates");
const { parseValidatorError } = require("../utils/mongoose");

const findById = async (_id, { returnDeleted = false } = {}) => {
    const result = await Model.findById(_id)
        .lean({ virtuals: true })
        .exec();
    if (!result || (!returnDeleted && result.isDeleted)) {
        throw new RecordNotFoundError(Model, "_id", _id);
    }
    delete result.isDeleted;
    return result;
};

const find = async ({ filter = {}, sort = { createdAt: -1 } } = {}) => {
    if (filter.name) {
        filter.name = { $regex: filter.name, $options: 'i' };
    }

    const result = await Model.find(
        {
            isDeleted: false,
            ...filter
        }
    )
        .sort(sort)
        .lean({ virtuals: true })
        .exec();

    return result;
};

const create = async (data) => {
    try {
        const result = new Model(data);
        await result.save();
        const resultObj = result.toObject({
            virtuals: true,
            transform: (doc, ret, options) => {
                delete ret.isDeleted;
                return ret;
            },
        });
        return resultObj;
    } catch (error) {
        if (error instanceof mongoose.Error.ValidationError) {
            return {
                error: 'ValidationError',
                message: parseValidatorError(error),
            };
        } else {
            return { success: false, message: error.message };
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
                fields: { isDeleted: 0 },
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

const deleteById = async (docId) => {
    const result = await Model.findByIdAndDelete(docId).lean();

    if (!result) {
        throw new RecordNotFoundError(Model, "_id", docId);
    }

    return result;
};

module.exports = {
    findById,
    find,
    create,
    updateById,
    deleteById
};
