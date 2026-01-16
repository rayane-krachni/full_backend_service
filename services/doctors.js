const { RecordNotFoundError } = require("../exceptions");
const Model = require("../models/user");
const Appointment = require("../models/appointments");
const HomeCare = require("../models/homeCares");

const { Patient } = require("../models/user");
const favoriteService = require("./favorite");

const findById = async (
  _id,
  { returnPassword = false, returnData = false } = {},
  user = null
) => {
  const result = await Model.User.findById(_id)
    .select("businessInfo specialities picture organizationId")
    .lean({ virtuals: true })
    .populate("specialities")
    .populate({
      path: "organizationId",
      select: "name",
    })
    .exec();

  if (!result || result.isDeleted) {
    throw new RecordNotFoundError(Model.User, "_id", _id);
  }

  delete result.isDeleted;
  
  // Check if doctor is in user's favorites
  let is_favorite = false;
  if (user && user.role === "PATIENT") {
    const favorite = await favoriteService.findById(_id, user._id);
    is_favorite = favorite !== null;
  }
  
  // Add is_favorite flag to result
  result.is_favorite = is_favorite;

  // If doctor belongs to an organization
  if (result.organizationId) {
    return {
      ...result,
      businessInfo: {
        ...result.businessInfo,
        businessName: result.organizationId.name,
      },
      organization: result.organizationId._id,
    };
  }

  return result;
};

const find = async ({ filter = {} }, user) => {
  try {
    let userFilter = {
      isDeleted: false,
      role: { $in: ["DOCTOR", "NURSE"] },
      // Must have business name or be admin of an organization
      $or: [
        {
          "businessInfo.businessName": { $exists: true, $ne: null, $ne: "" },
          $or: [
            { organizationId: { $exists: false } }, // Standalone professionals without organizationId field
            { organizationId: null } // Standalone professionals with organizationId set to null
          ]
        },
        {
          organizationId: { $exists: true, $ne: null },
        },
      ],
      // Must have at least one availability entry
      "businessInfo.availability.0": { $exists: true }
    };

    if (filter.speciality) {
      userFilter.specialities = { $in: [filter.speciality] };
    }

    if (filter.businessName) {
      userFilter.$or = [
        { "businessInfo.businessName": { $regex: filter.businessName, $options: "i" } },
        { fullName: { $regex: filter.businessName, $options: "i" } }
      ];
    }

    if (filter.practiceType) {
      userFilter["businessInfo.practiceType"] = filter.practiceType;
    }

    if (filter.services) {
      if (filter.services.remote !== undefined) {
        userFilter["businessInfo.services.remote"] =
          filter.services.remote === "true" || filter.services.remote === true;
      }
      if (filter.services.inPerson !== undefined) {
        userFilter["businessInfo.services.inPerson"] =
          filter.services.inPerson === "true" ||
          filter.services.inPerson === true;
      }
      if (filter.services.homeCare !== undefined) {
        userFilter["businessInfo.services.homeCare"] =
          filter.services.homeCare === "true" ||
          filter.services.homeCare === true;
      }
    }

    if (filter.wilaya) {
      userFilter["businessInfo.address.wilaya"] = {
        $regex: filter.wilaya,
        $options: "i",
      };
    }

    // Filter by service through homeCare records
    if (filter.service) {
      const serviceFilter = Array.isArray(filter.service) 
        ? { $in: filter.service }
        : typeof filter.service === 'object' && filter.service.$in
        ? filter.service
        : filter.service;
      
      // Find all homeCare records with the specified service(s)
      const homeCareRecords = await HomeCare.find({
        service: serviceFilter,
        isDeleted: false
      }).select('professional').lean();
      
      // Extract unique professional IDs
      const professionalIds = [...new Set(
        homeCareRecords
          .map(record => record.professional)
          .filter(id => id) // Remove null/undefined values
      )];
      
      if (professionalIds.length > 0) {
        userFilter._id = { $in: professionalIds };
      } else {
        // No professionals found with this service, return empty result
        return [];
      }
    }

    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;
    const sortField = filter.sortBy || "businessInfo.businessName";
    const sortOrder = filter.sortOrder === "desc" ? -1 : 1;

    let result = await Model.User.find(userFilter)
      .sort({ [sortField]: sortOrder })
      .select("businessInfo specialities picture role organizationId")
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true })
      .populate({
        path: "specialities",
        select: "name description",
      })
      .populate({
        path: "organizationId",
        select: "name id adminDoctor picture",
      })
      .exec();
    result = result.filter((doctor) => {
      if (!doctor.organizationId) return true; // Keep standalone professionals
      return doctor.role === "DOCTOR"
        ? doctor.organizationId.adminDoctor?.toString() === doctor._id.toString()
        : true; // Include nurses even if part of an organization
    });
    result = result.map((doctor) => {
      if (doctor.organizationId) {
        return {
          ...doctor,
          businessInfo: {
            ...doctor.businessInfo,
            businessName: doctor.organizationId.name,
          },
          business: doctor.organizationId.id,
          picture: doctor.organizationId.picture || doctor.picture,
        };
      }
      return doctor;
    });

    // Add is_favorite flag to each doctor if user is a patient
    if (user && user.role === "PATIENT") {
      // Get all favorite doctors for this patient
      const patient = await Patient.findById(user._id)
        .select("favoriteDoctors.doctorId")
        .lean();
      
      if (patient && patient.favoriteDoctors && patient.favoriteDoctors.length > 0) {
        // Create a Set of favorite doctor IDs for faster lookup
        const favoriteDoctorIds = new Set(
          patient.favoriteDoctors.map(fav => fav.doctorId.toString())
        );
        
        // Add is_favorite flag to each doctor
        result = result.map(doctor => ({
          ...doctor,
          is_favorite: favoriteDoctorIds.has(doctor._id.toString())
        }));
      } else {
        // No favorites, mark all as not favorite
        result = result.map(doctor => ({
          ...doctor,
          is_favorite: false
        }));
      }
    }

    return result || [];
  } catch (error) {
    console.error("Error in find function:", error);
    return [];
  }
};
const getDoctorPatients = async (doctorId, { page = 1, limit = 10 } = {}) => {
  const aggregation = await Appointment.aggregate([
    {
      $match: {
        doctor: doctorId,
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
  const patients = await Model.Patient.find({
    _id: { $in: patientIds },
    isDeleted: false,
  })
    .select("fullName picture")
    .lean();
  // Combine the data
  const result = aggregation.map((aggItem) => {

    const patient = patients.find(
      (p) => p._id.toString() === aggItem._id.toString()
    );
    if (patient)
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
const approveDoc = async (doctorId, documentType, approvedBy) => {
  const validDocumentTypes = ["diploma", "licenseScan", "idProof"];

  if (!validDocumentTypes.includes(documentType)) {
    throw new Error(`Invalid document type: ${documentType}`);
  }

  const update = {
    $set: {
      [`documents.verificationStatus.${documentType}`]: "APPROVED",
      [`documents.approvedBy.${documentType}`]: approvedBy,
      [`documents.approvedAt.${documentType}`]: new Date(),
    },
    $unset: {
      [`documents.rejectionReasons.${documentType}`]: "",
    },
  };

  const doctor = await Model.Doctor.findByIdAndUpdate(doctorId, update, {
    new: true,
  }).select("documents");

  if (!doctor) {
    throw new RecordNotFoundError(Model.Doctor, "_id", doctorId);
  }

  // Check if all documents are approved
  await checkFullVerification(doctorId);

  return {
    success: true,
    message: `${documentType} approved successfully`,
    documents: doctor.documents,
  };
};

const rejectDoc = async (doctorId, documentType, reason, rejectedBy) => {
  const validDocumentTypes = ["diploma", "licenseScan", "idProof"];

  if (!validDocumentTypes.includes(documentType)) {
    throw new Error(`Invalid document type: ${documentType}`);
  }

  const update = {
    $set: {
      [`documents.verificationStatus.${documentType}`]: "REJECTED",
      [`documents.rejectionReasons.${documentType}`]: reason,
      [`documents.rejectedBy.${documentType}`]: rejectedBy,
      [`documents.rejectedAt.${documentType}`]: new Date(),
    },
  };

  const doctor = await Model.Doctor.findByIdAndUpdate(doctorId, update, {
    new: true,
  }).select("documents");

  if (!doctor) {
    throw new RecordNotFoundError(Model.Doctor, "_id", doctorId);
  }

  return {
    success: true,
    message: `${documentType} rejected successfully`,
    documents: doctor.documents,
  };
};

const checkFullVerification = async (doctorId) => {
  const doctor = await Model.Doctor.findById(doctorId).select(
    "documents.verificationStatus"
  );

  if (!doctor) return;

  const { verificationStatus } = doctor.documents;
  const allApproved = Object.values(verificationStatus).every(
    (status) => status === "APPROVED"
  );

  if (allApproved) {
    await Model.Doctor.findByIdAndUpdate(doctorId, {
      $set: { isVerified: true },
    });
  }
};

module.exports = {
  findById,
  find,
  getDoctorPatients,
  approveDoc,
  rejectDoc,
  checkFullVerification,
};
