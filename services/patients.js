const { RecordNotFoundError } = require("../exceptions");
const Model = require("../models/user");
const Appointment = require("../models/appointments");

const findById = async (
  _id,
  user,
  { returnPassword = false, returnData = false } = {}
) => {
  const result = await Model.User.findById(_id, {
    passwordHash: 0,
    passwordSalt: 0,
    language: 0,
    account_pin: 0,
    password_pin: 0,
    isTrial: 0,
    isActive: 0,
    role: 0,
    notificationPreferences: 0,
    createdAt: 0,
    updatedAt: 0,
    ...(returnPassword ? { passwordHash: 1, passwordSalt: 1 } : {}), // optionally include passwords
  })
    .lean({ virtuals: true })
    .populate({
      path: "familyMembers",
      select: "fullName picture id medicalInfo",
    })
    .exec();
  if (user.role === "DOCTOR") {
    const hasValidAppointment = await Appointment.exists({
      doctor: user._id,
      patient: _id,
      status: { $ne: "CANCELLED" },
      isDeleted: false,
    });

    if (!hasValidAppointment) {
      throw new RecordNotFoundError(Model.User, "_id", _id);
    }
  }

  if (!result || result.isDeleted) {
    throw new RecordNotFoundError(Model.User, "_id", _id);
  }

  delete result.isDeleted;
  return result;
};

const find = async ({ filter = {} }, user) => {
  let userFilter = { isDeleted: false };

  const page = filter.page || 1;
  const limit = filter.limit || 10;
  const skip = (page - 1) * limit;
  const sortField = filter.sortBy || "businessInfo.businessName";
  const sortOrder = filter.sortOrder === "desc" ? -1 : 1;
  const result = await Model.Patient.find(userFilter)
    .sort({ [sortField]: sortOrder })
    .select("picture")
    .skip(skip)
    .limit(limit)
    .lean({ virtuals: true })
    .exec();

  return result;
};
const getPatientDoctors = async (patientId, { page = 1, limit = 10 } = {}) => {
  const aggregation = await Appointment.aggregate([
    {
      $match: {
        patient: patientId, // Changed from doctorId to patientId
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: "$patient",
        appointmentCount: { $sum: 1 },
        latestAppointment: { $max: "$createdAt" },
      },
    },
    {
      $sort: { latestAppointment: -1 }, // Sort by most recent appointment first
    },
    {
      $skip: (page - 1) * limit,
    },
    {
      $limit: limit,
    },
  ]);
  if (aggregation.length === 0) {
    return [];
  }

  // Get patient details for the aggregated IDs
  const patientIds = aggregation.map((item) => item._id);

  const patients = await Model.User.find({
    _id: { $in: patientIds },
    isDeleted: false,
  })
    .select("fullName picture _id")
    .lean();

  // Combine the data
  const result = aggregation.map((aggItem) => {
    const patient = patients.find(
      (p) => p._id.toString() === aggItem._id.toString()
    );

    return {
      id: patient._id,
      fullName: patient.fullName,
      picture: patient.picture,
      appointmentCount: aggItem.appointmentCount,
      lastAppointmentDate: aggItem.latestAppointment,
    };
  });

  return result;
};

module.exports = {
  findById,
  find,
  getPatientDoctors,
};
