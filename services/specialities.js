const { default: mongoose } = require("mongoose");
const { RecordNotFoundError, DataValidationError } = require("../exceptions");
const Model = require("../models/specialities");
const { parseValidatorError } = require("../utils/mongoose");
const { User } = require("../models/user");

// Helper function to localize speciality fields
const localizeSpeciality = (speciality, userLanguage = 'fr') => {
    if (!speciality) return speciality;
    
    const localized = { ...speciality };
    
    // Localize name
    if (typeof speciality.name === 'object' && speciality.name !== null) {
        localized.name = speciality.name[userLanguage] || speciality.name.en || speciality.name;
    }
    
    // Localize description
    if (typeof speciality.description === 'object' && speciality.description !== null) {
        localized.description = speciality.description[userLanguage] || speciality.description.en || speciality.description;
    }
    
    return localized;
};


const findById = async (
    _id,
    { returnDeleted = false, populateCategory = false, userId = null, user = null } = {}
) => {
    // Get user's preferred language if userId is provided
    let userLanguage = 'fr';
    if (userId) {
        const user = await User.findById(userId).select('language');
        userLanguage = user?.language || 'fr';
    }

    const result = await Model.findById(_id)
        .lean({ virtuals: true })
        .exec();
    if (!result || (!returnDeleted && result.isDeleted)) {
        throw new RecordNotFoundError(Model, "_id", _id);
    }
    delete result.isDeleted;
    
    if (user.role == "SUPER_ADMIN") {
      return result;
    }
    return localizeSpeciality(result, userLanguage);
};

const find = async ({ filter = {}, sort = { createdAt: -1 } } = {}, user = null) => {
    // Get user's preferred language if user is provided
    let userLanguage = 'en';
    if (user && user._id) {
        const userData = await User.findById(user._id).select('language');
        userLanguage = userData?.language || 'en';
    }

    if (filter.name) {
        filter.$or = [
            { 'name.en': { $regex: filter.name, $options: 'i' } },
            { 'name.ar': { $regex: filter.name, $options: 'i' } },
            { 'name.fr': { $regex: filter.name, $options: 'i' } },
            { ref: { $regex: filter.name, $options: 'i' } }
        ];
        delete filter.name;
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

    if (filter.share && result) {
        const link = await generateExcel(result);
        return { 'url': link };
    }
    
    if (user.role == "SUPER_ADMIN") {
      return result;
    }

    // Localize all specialities in the result
    const localizedResult = result.map(speciality => localizeSpeciality(speciality, userLanguage));

    return localizedResult;
};

const create = async (data, user) => {
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
        
        // Get user's preferred language and localize the result
        let userLanguage = 'fr';
        if (user && user._id) {
            const userData = await User.findById(user._id).select('language');
            userLanguage = userData?.language || 'fr';
        }
        
        return localizeSpeciality(resultObj, userLanguage);
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

const updateById = async (_id, data, userId = null) => {
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
        
        // Get user's preferred language and localize the result
        let userLanguage = 'fr';
        if (userId) {
            const userData = await User.findById(userId).select('language');
            userLanguage = userData?.language || 'fr';
        }
        
        return localizeSpeciality(result, userLanguage);
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
