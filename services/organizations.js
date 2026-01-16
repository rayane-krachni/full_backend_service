const { default: mongoose } = require("mongoose");
const { RecordNotFoundError, DataValidationError } = require("../exceptions");
const Model = require("../models/organizations");
const { parseValidatorError } = require("../utils/mongoose");
const User = require("../models/user");
const {
  hashPassword,
  checkPassword,
  generateStrongPassword,
  issueJWT,
} = require("../utils/crypto");

const findById = async (
  _id,
  { returnDeleted = false, populateCategory = false } = {}
) => {
  const result = await Model.findById(_id)
    .populate("members")
    .lean({ virtuals: true })
    .exec();
  if (!result || (!returnDeleted && result.isDeleted)) {
    throw new RecordNotFoundError(Model, "_id", _id);
  }
  delete result.isDeleted;
  return result;
};

const find = async (
  { filter = {}, sort = { createdAt: -1 } } = {},
  user = null
) => {
  if (filter.name) {
    filter.$or = [
      { name: { $regex: filter.name, $options: "i" } },
      { ref: { $regex: filter.name, $options: "i" } },
    ];
    delete filter.name;
  }

  const result = await Model.find({
    isDeleted: false,
    ...filter,
  })
    .populate("members")
    .sort(sort)
    .lean({ virtuals: true })
    .exec();

  if (filter.share && result) {
    const link = await generateExcel(result);
    return { url: link };
  }

  return result;
};

const create = async (data, user) => {
  const session = await mongoose.startSession();
  let newOrgObj = null;
  try {
    await session.withTransaction(
      async () => {
        // 1. Verify the authenticated user is a doctor
        if (user.role !== "DOCTOR") {
          throw new Error("Only doctors can create organizations");
        }

        // 2. Create the organization with adminDoctor set to current user
        const orgData = {
          ...data,
          adminDoctor: user._id,
          members: [user._id],
        };

        const result = await Model.create([orgData], { session });
        const newOrg = result[0];

        // 3. Atomically update doctor's record with preconditions to avoid race
        const updateRes = await User.Doctor.updateOne(
          {
            _id: user._id,
            isDeleted: false,
            isIndependent: true,
            $or: [
              { organizationId: { $exists: false } },
              { organizationId: null },
            ],
          },
          {
            $set: {
              organizationId: newOrg._id,
              isIndependent: false,
              "businessInfo.practiceType": "ORGANIZATION",
            },
          },
          { session }
        );

        if (updateRes.modifiedCount === 0) {
          // Preconditions failed: doctor already part of an org or not independent
          throw new Error("Doctor is already part of an organization");
        }

        newOrgObj = newOrg.toObject({
          virtuals: true,
          transform: (doc, ret) => {
            delete ret.isDeleted;
            return ret;
          },
        });
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
        readPreference: "primary",
      }
    );

    return newOrgObj;
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return {
        error: "ValidationError",
        message: parseValidatorError(error),
      };
    }
    return {
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  } finally {
    session.endSession();
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

const deleteById = async (orgId) => {
  const deletedOrg = await Model.findByIdAndDelete(orgId).lean();

  if (!deletedOrg) {
    throw new RecordNotFoundError(Model, "_id", orgId);
  }

  await User.Doctor.updateMany(
    { organizationId: orgId },
    { 
      $set: { 
        isIndependent: true,
        organizationId: null 
      } 
    }
  );

  return deletedOrg;
};

const createDoctor = async (doctorData, adminUser) => {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      // 1. Verify admin is actually an organization admin
      const organization = await Model.findOne(
        { adminDoctor: adminUser._id },
        null,
        { session }
      );

      if (!organization) {
        throw new Error("Only organization admins can add doctors");
      }

      let { passwordHash, passwordSalt } = doctorData.password
        ? await hashPassword(doctorData.password)
        : await generateRandomPassword();

      const defaults = {
        role: "DOCTOR",
        isActive: true,
        isVerified: false,
        isDeleted: false,
        isIndependent: false,
        language: "fr",
        picture: "https://example.com/data/static/public/users/default.webp",
        businessInfo: {
          practiceType: "ORGANIZATION",
          services: {
            inPerson: true,
            remote: false,
            homeCare: false,
          },
          consultationFee: 0,
          sessionDuration: 30,
          availability: [],
          unavailability: [],
        },
        documents: {
          verificationStatus: {
            diploma: "PENDING",
            licenseScan: "PENDING",
            idProof: "PENDING",
          },
          rejectionReasons: {
            diploma: "",
            licenseScan: "",
            idProof: "",
          },
        },
      };

      const newDoctorData = {
        ...defaults,
        ...doctorData,
        passwordHash,
        passwordSalt,
        organizationId: organization._id,
        createdBy: adminUser._id,
        businessInfo: {
          ...defaults.businessInfo,
          ...(doctorData.businessInfo || {}),
          practiceType: "ORGANIZATION",
        },
        documents: {
          ...defaults.documents,
          ...(doctorData.documents || {}),
        },
      };

      // 5. Create and save new doctor
      const newDoctor = new User.Doctor(newDoctorData);
      await newDoctor.save({ session });

      // 6. Add to organization members
      await Model.findByIdAndUpdate(
        organization._id,
        { $addToSet: { members: newDoctor._id } },
        { session }
      );

      // 7. Return sanitized doctor data
      return newDoctor.toObject({
        virtuals: true,
        transform: (doc, ret) => {
          delete ret.passwordHash;
          delete ret.passwordSalt;
          delete ret.isDeleted;
          delete ret.__v;
          return ret;
        },
      });
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      throw {
        error: "ValidationError",
        message: parseValidatorError(error),
      };
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

// Helper function to generate random password
const generateRandomPassword = async () => {
  const randomPassword = crypto.randomBytes(8).toString("hex");
  return await hashPassword(randomPassword);
};

const deleteDoctor = async (doctorId, adminUser) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // 1. Verify admin privileges and that doctor exists in their organization
      const organization = await Model.findOne({
        adminDoctor: adminUser._id,
        members: doctorId,
      }).session(session);

      if (!organization) {
        throw new Error("Not authorized or doctor not in your organization");
      }

      // 2. Remove doctor from organization members
      await Model.findByIdAndUpdate(
        organization._id,
        { $pull: { members: doctorId } },
        { session }
      );

      // 3. Delete doctor completely from database
      await User.Doctor.findByIdAndDelete(doctorId, { session });

      // 4. (Optional) Cleanup related data
      // await Appointment.deleteMany({ doctor: doctorId }).session(session);
    });

    return { success: true, message: "Doctor deleted successfully" };
  } finally {
    session.endSession();
  }
};

const getOrganizationDoctors = async (user) => {
  try {
    // 1. Get organization where user is adminDoctor
    const organization = await Model.findOne({
      adminDoctor: user._id,
    }).lean();

    if (!organization) {
      return res.status(403).json({
        success: false,
        message: "Only organization admins can access this data",
      });
    }

    // 2. Get all doctors in the organization
    const doctors = await User.Doctor.find({
      organizationId: organization._id,
      isDeleted: false,
      _id: { $ne: user._id } // Exclude the authenticated doctor
    })
    .select('-passwordHash -passwordSalt -__v -isDeleted -createdBy -__t')
    .populate('specialities', 'name')
    .lean();

    // 3. Format response
    const response = doctors.map((doctor) => ({
      ...doctor,
      specialities: doctor.specialities?.map((s) => s.name) || [],
    }));

    return response;
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  findById,
  find,
  create,
  updateById,
  deleteById,
  createDoctor,
  deleteDoctor,
  getOrganizationDoctors,
};
