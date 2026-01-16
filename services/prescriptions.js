const { default: mongoose } = require("mongoose");
const { RecordNotFoundError, DataValidationError } = require("../exceptions");
const Model = require("../models/prescriptions");
const { parseValidatorError } = require("../utils/mongoose");

const findById = async (_id, { returnDeleted = false } = {}) => {
    const result = await Model.findById(_id)
        .populate("doctor", "name")
        .populate("patient", "name")
        .lean({ virtuals: true })
        .exec();
    if (!result || (!returnDeleted && result.isDeleted)) {
        throw new RecordNotFoundError(Model, "_id", _id);
    }
    delete result.isDeleted;
    return result;
};

const find = async ({ filter = {}, sort = { createdAt: -1 } } = {}) => {
    const result = await Model.find(
        {
            isDeleted: false,
            ...filter
        }
    )
        .populate("doctor", "name")
        .populate("patient", "name")
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

module.exports = {
    findById,
    find,
    create
};
