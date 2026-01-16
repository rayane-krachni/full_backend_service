const { default: mongoose } = require("mongoose");
const { RecordNotFoundError, DataValidationError } = require("../exceptions");
const Model = require("../models/appointments");
const User = require("../models/user");
const Transaction = require("../models/transaction");
const { parseValidatorError } = require("../utils/mongoose");
const moment = require("moment-timezone");

const findById = async (
  _id,
  { returnDeleted = false, populateCategory = false, user = null } = {}
) => {
  const result = await Model.findById(_id)
    .populate("patient")
    .populate("doctor")
    .populate("reason")
    .populate("service")
    .lean({ virtuals: true })
    .exec();
  if (!result || (!returnDeleted && result.isDeleted)) {
    throw new RecordNotFoundError(Model, "_id", _id);
  }
  delete result.isDeleted;
  if (Array.isArray(result.service) && result.service.length > 0) {
    const serviceNames = result.service
      .map((s) => {
        if (s.name && typeof s.name === "object") {
          return s.name.fr || s.name.en || s.name.default || "";
        }
        return s.name || "";
      })
      .filter((name) => name)
      .join(", ");

    const serviceDescriptions = result.service
      .map((s) => {
        if (s.description && typeof s.description === "object") {
          return (
            s.description.fr || s.description.en || s.description.default || ""
          );
        }
        return s.description || "";
      })
      .filter((desc) => desc)
      .join(", ");

    result.service = {
      _id: result.service[0]._id,
      name: serviceNames,
      description: serviceDescriptions,
      ...result.service[0],
    };
    result.service.name = serviceNames;
    result.service.description = serviceDescriptions;
  } else if (Array.isArray(result.service) && result.service.length === 0) {
    result.service = null;
  }

  if (user.role == "SUPER_ADMIN") {
    try {
      // Find transaction related to this appointment
      const transaction = await Transaction.findOne({
        appointment: _id,
        isDeleted: false,
      })
        .lean()
        .exec();
      // console.log(transaction);
      // Add transaction data to the result
      if (transaction) {
        result.payment.transaction = transaction;
      }
    } catch (error) {
      // Handle error (e.g., Transaction model not available)
      console.error("Error fetching transaction data:", error);
      result.payment = null;
    }
  }

  return result;
};

const find = async (
  { filter = {}, sort = { createdAt: -1 } } = {},
  user = null
) => {
  const baseFilter = { isDeleted: false };

  if (user) {
    switch (user.role) {
      case "PATIENT":
        const patientWithFamily = await User.User.findById(user._id)
          .populate('familyMembers')
          .lean()
          .exec();

        const patientAndFamilyIds = [
          user._id,
          ...(patientWithFamily?.familyMembers?.map(member => member._id) || [])
        ];

        baseFilter.patient = { $in: patientAndFamilyIds };
        break;

      case "DOCTOR":
        baseFilter.doctor = user._id;
        sort = { date: 1, time: 1 }; // 👈 Override sort for doctors
        break;

      case "ADMIN":
      case "SUPER_ADMIN":
        break;

      default:
        return [];
    }
  } else {
    return [];
  }

  if (filter.name) {
    filter.$or = [
      { name: { $regex: filter.name, $options: "i" } },
      { ref: { $regex: filter.name, $options: "i" } },
    ];
    delete filter.name;
  }

  const finalFilter = {
    ...baseFilter,
    ...filter,
  };

  const result = await Model.find(finalFilter)
    .populate("patient")
    .populate("doctor")
    .populate("reason")
    .populate("service")
    .sort(sort)
    .lean({ virtuals: true })
    .exec();
  // console.log(result, finalFilter)
  const transformedResult = result.map((appointment) => {
    if (Array.isArray(appointment.service) && appointment.service.length > 0) {
      const userLang = user?.language || "fr";
      const serviceNames = appointment.service
        .map((s) => s.name?.[userLang] || s.name?.fr || "")
        .filter(Boolean)
        .join(", ");
      const serviceDescriptions = appointment.service
        .map((s) => s.description?.[userLang] || s.description?.fr || "")
        .filter(Boolean)
        .join(", ");

      appointment.service = {
        name: serviceNames,
        description: serviceDescriptions,
      };
    } else {
      appointment.service = null;
    }
    return appointment;
  });

  return transformedResult;
};


const getMy = async (
  { filter = {}, sort = { createdAt: -1 } } = {},
  user = null
) => {
  if (!user) return { next: [], archive: [] };
  
  if (user.role === "PATIENT") {
    // Get patient's family members
    const patientWithFamily = await User.User.findById(user._id)
      .populate('familyMembers')
      .lean()
      .exec();
    
    // Create array of patient ID + family member IDs
    const patientAndFamilyIds = [
      user._id,
      ...(patientWithFamily?.familyMembers?.map(member => member._id) || [])
    ];
    
    filter.patient = { $in: patientAndFamilyIds };
  } else if (user.role === "DOCTOR") {
    filter.doctor = user._id;
  } else if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return { next: [], archive: [] };
  }

  const allAppointments = await Model.find(filter)
    .sort({ date: 1, time: 1 })
    .populate("doctor", "fullName picture")
    .populate("patient")
    .populate("service")
    .lean();

  // Transform service array to single service object with concatenated names
  const transformedAppointments = allAppointments.map((appointment) => {
    if (Array.isArray(appointment.service) && appointment.service.length > 0) {
      const userLang = user?.language || "fr";
      const serviceNames = appointment.service
        .map((s) => s.name?.[userLang] || s.name?.fr || "")
        .filter((name) => name)
        .join(", ");
      const serviceDescriptions = appointment.service
        .map((s) => s.description?.[userLang] || s.description?.fr || "")
        .filter((desc) => desc)
        .join(", ");

      appointment.service = {
        name: serviceNames,
        description: serviceDescriptions,
      };
    } else if (
      Array.isArray(appointment.service) &&
      appointment.service.length === 0
    ) {
      appointment.service = null;
    }
    return appointment;
  });

  const now = new Date();
  const currentDate = now.toISOString().split("T")[0];
  const currentTime = now.toTimeString().substring(0, 5);

  const result = {
    next: [],
    archive: [],
  };
  
  transformedAppointments.forEach((appointment) => {
    const appointmentDateStr = appointment.date.toISOString().split("T")[0];
    const appointmentTime = appointment.time;

    if (
      appointmentDateStr > currentDate ||
      (appointmentDateStr === currentDate && appointmentTime >= currentTime)
    ) {
      result.next.push(appointment);
    } else {
      result.archive.push(appointment);
    }
  });

  return result;
};

const getDoctorQueue = async (
  { filter = {}, sort = { createdAt: -1 } } = {},
  user = null,
  doctorId = null
) => {
  if (!user || user.role !== "PATIENT") return null;
  const algiersTime = moment().tz("Africa/Algiers");
  const todayStr = algiersTime.format("YYYY-MM-DD");
  const currentTime = algiersTime.format("HH:mm");

  const today = new Date(todayStr);

  const doctorAppointments = await Model.find({
    isDeleted: false,
    doctor: doctorId,
    date: today,
    status: { $in: ["pending", "confirmed", "in-progress"] },
  })
    .sort({ time: 1 })
    .populate("patient", "fullName")
    .populate("service")
    .lean();

  // Transform service array to single service object with concatenated names
  const transformedAppointments = doctorAppointments.map((appointment) => {
    if (Array.isArray(appointment.service) && appointment.service.length > 0) {
      const serviceNames = appointment.service
        .map((s) => s.name || "")
        .filter((name) => name)
        .join(", ");
      const serviceDescriptions = appointment.service
        .map((s) => s.description || "")
        .filter((desc) => desc)
        .join(", ");

      appointment.service = {
        // _id: appointment.service[0]._id,
        name: serviceNames,
        description: serviceDescriptions,
        // ...appointment.service[0]
      };
      appointment.service.name = serviceNames;
      appointment.service.description = serviceDescriptions;
    } else if (
      Array.isArray(appointment.service) &&
      appointment.service.length === 0
    ) {
      appointment.service = null;
    }
    return appointment;
  });

  const yourAppointment = transformedAppointments.find(
    (appt) => appt.patient._id.toString() === user._id.toString()
  );

  if (!yourAppointment) {
    return {
      doctor: doctorId,
      message: "You don't have an appointment with this doctor today",
      queue: [],
    };
  }

  // 3. Calculate position and wait time
  const upcomingApps = transformedAppointments.filter(
    (appt) =>
      appt.time >= currentTime || ["pending", "confirmed"].includes(appt.status)
  );

  const yourPosition =
    upcomingApps.findIndex(
      (appt) => appt._id.toString() === yourAppointment._id.toString()
    ) + 1;

  const avgTime = 15;
  const waitTime = (yourPosition - 1) * avgTime;

  return {
    doctor: doctorId,
    totalAppointments: transformedAppointments.length,
    queuePosition: yourPosition,
    estimatedWait: `${waitTime} minutes`,
    nextPatient: upcomingApps[0]?.patient.fullName,
    yourAppointmentTime: yourAppointment.time,
  };
};

const create = async (data, user) => {
  try {
    const isDoctor = user.role === "DOCTOR";

    const appointmentData = {
      date: data.date,
      time: data.time,
      reason: data.reason || "Consultation",
      status: "pending",
      isRemote: data.isRemote || false,
      isHomeCare: data.isHomeCare || false,
      isPresent: data.isPresent || false,
      notes: data.notes,
      documents: data.documents || [],
    };

    if (isDoctor) {
      if (!data.patient) {
        throw new Error(
          "Patient ID is required when creating appointment as doctor"
        );
      }
      appointmentData.doctor = user._id;
      appointmentData.patient = data.patient;
    } else {
      if (!data.doctor) {
        throw new Error(
          "Doctor ID is required when creating appointment as patient"
        );
      }
      if (data.familyMember) {
        const exists = user.familyMembers.some(
          (item) => item.id === data.familyMember
        );
        if (exists) appointmentData.patient = data.familyMember;
        else throw new Error("Patient is not on your relatives list");
      } else appointmentData.patient = user._id;
      appointmentData.doctor = data.doctor;
    }
    // console.log(appointmentData);
    // return;
    const result = new Model(appointmentData);
    await result.save();

    return result.toObject({
      virtuals: true,
      transform: (doc, ret, options) => {
        delete ret.isDeleted;
        return ret;
      },
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return {
        error: "ValidationError",
        message: parseValidatorError(error),
      };
    } else {
      return { success: false, message: error.message };
    }
  }
};

const updateById = async (_id, data, user) => {
  try {
    const allowedFields = {
      date: true,
      time: true,
      status: true,
      isRemote: true,
      isHomeCare: true,
      isPresent: true,
      notes: true,
      documents: true,
      consultationNotes: true,
      preConsultation: true,
      homeCareStatus: true,
      doctor: true
    };

    const filteredData = {};
    for (const key in data) {
      if (allowedFields[key]) {
        filteredData[key] = data[key];
      }
    }

    if (user.role === "PATIENT") {
      delete filteredData.status;
      delete filteredData.consultationNotes;
      delete filteredData.homeCareStatus;
    }

    if (user.role === "DOCTOR") {
      delete filteredData.patient;
      // delete filteredData.doctor;
    }

    const result = await Model.findOneAndUpdate(
      { _id, isDeleted: false },
      filteredData,
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

const reorderQueue = async (appointmentIds, user) => {
  if (user.role !== "DOCTOR") throw new Error("Unauthorized");
  
  const updates = appointmentIds.map((id, index) => {
    return Model.updateOne({ _id: id, doctor: user._id }, { queueOrder: index });
  });
  
  await Promise.all(updates);
  return { success: true };
};

module.exports = {
  findById,
  find,
  create,
  updateById,
  deleteById,
  getMy,
  getDoctorQueue,
  reorderQueue,
};
