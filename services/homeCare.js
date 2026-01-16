const mongoose = require("mongoose");
const Service = require("../models/service");
const Appointment = require("../models/appointments");
const User = require("../models/user");
const Notification = require("../models/notification");
const Transaction = require("../models/transaction");
const serviceUtil = require("../services/service");
const {
  calculateDistance,
  formatForMongo,
  calculateETA,
} = require("../utils/geo");
const { handleError, catchAsync, AppError } = require("../utils/errors");

// Internal helper functions for multiple services support

// List all available services with filters (unchanged)
const listServices = async (filters = {}, user = null) => {
  let query = { isDeleted: false };
  let sort = { createdAt: -1 };
  if (filters.type) query.type = filters.type;
  if (filters.speciality) query.speciality = filters.speciality;
  if (filters.timeSensitive) query.timeSensitive = true;
  // console.log(user);
  return await serviceUtil.find({ query, sort }, user, (isFolded = false));
  // const result = await Service.find().sort(sort).lean({ virtuals: true }).exec();
  // return result;
};

// Create new service request (now using Appointment)
const createServiceRequest = async (requestData) => {
  // Convert serviceId to array format for unified processing
  const serviceIdArray = Array.isArray(requestData.serviceId)
    ? requestData.serviceId
    : [requestData.serviceId];

  // Fetch all services
  const services = await Service.find({ _id: { $in: serviceIdArray } });
  if (services.length !== serviceIdArray.length) {
    throw new Error("One or more services not found");
  }

  // Calculate payment breakdown
  const servicesBreakdown = services.map((service) => ({
    service: service._id,
    basePrice: service.basePrice,
    fee: service.fee,
  }));

  const totalAmount = services.reduce(
    (sum, service) => sum + service.basePrice + service.fee,
    0
  );
  const platformFee = totalAmount * 0.1; // 10% platform fee
  const estimatedAmount = totalAmount + platformFee;

  // Use the first service for primary appointment type mapping
  const primaryService = services[0];
  const serviceTypeMap = {
    DOCTOR: "HOME_DOCTOR",
    NURSE: "HOME_NURSE",
    ANALYSIS: "ANALYSIS",
    TRANSPORT: "TRANSPORT",
  };

  const appointment = new Appointment({
    patient: requestData.patient,
    doctor: requestData.doctor,
    reason: requestData.reason,
    service: serviceIdArray.map((id) => new mongoose.Types.ObjectId(id)), // Convert string IDs to ObjectIds
    serviceType: serviceTypeMap[primaryService.type],
    modality: primaryService.type === "TRANSPORT" ? "TRANSPORT" : "HOME_VISIT",
    status: "requested",
    date: requestData.date,
    time: requestData.time,
    isHomeCare: true,
    serviceLocation: requestData.location,
    payment: {
      amount: totalAmount,
      estimatedAmount: estimatedAmount,
      platformFee: platformFee,
      servicesBreakdown: servicesBreakdown,
      status: "pending",
    },
    ...(primaryService.type === "TRANSPORT" && {
      serviceDetails: {
        transport: {
          vehicleType: "BASIC",
          requiresMedicalTeam: primaryService.name.includes("Médecin"),
        },
      },
    }),
  });

  return await appointment.save();
};

// Get request details (updated for Appointment)
const getRequestDetails = async (requestId, user) => {
  const request = await Appointment.findById(requestId)
    .populate("patient", "fullName phoneNumber")
    .populate("professional", "fullName picture")
    .populate("service");

  if (!request) throw new Error("Request not found");

  // Authorization check
  if (user.role === "PATIENT" && !request.patient._id.equals(user._id)) {
    throw new Error("Unauthorized access");
  }

  if (
    (user.role === "DOCTOR" || user.role === "NURSE") &&
    request.professional &&
    !request.professional._id.equals(user._id)
  ) {
    throw new Error("Unauthorized access");
  }

  return request;
};

// Find available professionals (updated for unified model)
const findAvailableProfessionals = async ({
  serviceType, // Now expects "HOME_DOCTOR", "HOME_NURSE" etc.
  speciality,
  patientLocation,
  radius = 10, // km
}) => {
  const roleMap = {
    HOME_DOCTOR: "DOCTOR",
    HOME_NURSE: "NURSE",
    TRANSPORT: "DRIVER", // Assuming you have driver role
  };

  const query = {
    role: roleMap[serviceType],
    isDeleted: false,
    isVerified: true,
    "address.gps": {
      $nearSphere: {
        $geometry: {
          type: "Point",
          coordinates: formatForMongo(patientLocation),
        },
        $maxDistance: radius * 1000, // meters
      },
    },
  };

  if (serviceType === "HOME_DOCTOR" && speciality) {
    query.specialities = speciality;
  }

  const professionals = await User.find(query)
    .select("fullName picture specialities rating address")
    .lean();

  return professionals.map((prof) => ({
    ...prof,
    distance: calculateDistance(patientLocation, prof.address.gps).toFixed(1),
    eta: Math.round(calculateDistance(patientLocation, prof.address.gps) * 2),
  }));
};

// Professional accepts request (updated)
const acceptServiceRequest = async (requestId, professionalId) => {
  return await Appointment.findByIdAndUpdate(
    requestId,
    {
      status: "confirmed",
      professional: professionalId,
      "timeline.acceptedAt": new Date(),
    },
    { new: true }
  );
};

// Mark service as complete (updated)
// Doctor confirms completion (first key)
const doctorConfirmCompletion = async (requestId, professionalId) => {
  const request = await Appointment.findById(requestId).populate(
    "patient",
    "name fcmToken"
  );
  const doctor = await User.Doctor.findById(professionalId);

  if (!doctor || !request) {
    return {
      success: false,
      message: "Unauthorized",
    }
    // throw new Error("Unauthorized");
  }

  if (request.completion.doctorConfirmed) {
    return {
      success: false,
      message: "Doctor has already confirmed completion",
    }
    // throw new Error("Doctor has already confirmed completion");
  }

  const updateData = {
    "completion.doctorConfirmed": true,
    "completion.doctorConfirmedAt": new Date(),
    $push: {
      "completion.completedBy": {
        userId: professionalId,
        userType: "doctor",
        confirmedAt: new Date(),
      },
    },
  };

  // Check if patient has already confirmed
  if (request.completion.patientConfirmed) {
    updateData.status = "completed";
    updateData["timeline.completedAt"] = new Date();

    // Notify patient that appointment is fully completed
    await Notification.create({
      userId: request.patient._id,
      docId: requestId,
      docType: "APPOINTMENT",
      action: "APPOINTMENT_COMPLETED",
      title: {
        en: "Appointment Completed",
        fr: "Rendez-vous terminé",
        ar: "تم إكمال الموعد",
      },
      message: {
        en: "Your home care appointment has been completed successfully with both confirmations.",
        fr: "Votre rendez-vous de soins à domicile a été complété avec succès avec les deux confirmations.",
        ar: "تم إكمال موعد الرعاية المنزلية بنجاح مع تأكيد الطرفين.",
      },
      metadata: { appointmentId: requestId },
    });

    // Sync Balance: Increment Doctor Debt
    await Balance.findOneAndUpdate(
      { doctor: request.professional || request.doctor }, 
      { 
        $inc: { 
          currentDebt: request.payment.platformFee || 0,
          totalIncome: request.payment.amount || 0
        },
        $set: { lastUpdated: new Date() }
      },
      { upsert: true, new: true }
    );
  } else {
    // Notify patient that doctor has confirmed and waiting for patient confirmation
    await Notification.create({
      userId: request.patient._id,
      docId: requestId,
      docType: "APPOINTMENT",
      action: "DOCTOR_CONFIRMED_COMPLETION",
      title: {
        en: "Doctor Confirmed Completion",
        fr: "Le médecin a confirmé la fin du rendez-vous",
        ar: "الطبيب أكد إكمال الموعد",
      },
      message: {
        en: "Your doctor has confirmed the appointment completion. Please confirm to finalize.",
        fr: "Votre médecin a confirmé la fin du rendez-vous. Veuillez confirmer pour finaliser.",
        ar: "طبيبك أكد إكمال الموعد. يرجى التأكيد لإتمام العملية.",
      },
      metadata: { appointmentId: requestId },
    });
  }

  return await Appointment.findByIdAndUpdate(requestId, updateData, {
    new: true,
  });
};

// Patient confirms completion (second key)
const patientConfirmCompletion = async (requestId, patientId) => {
  const request = await Appointment.findById(requestId).populate(
    "doctor",
    "name fcmToken"
  );
  const patient = await User.Patient.findById(patientId);

  if (
    !patient ||
    !request ||
    request.patient.toString() !== patientId.toString()
  ) {
    return {
      success: false,
      message: "Unauthorized action for this appointment",
    }
    // throw new AppError("Unauthorized action for this appointment", 403);

  }

  if (request.completion.patientConfirmed) {
    return {
      success: false,
      message: "Patient has already confirmed completion",
    }
    // throw new AppError("Patient has already confirmed completion", 400);
  }

  const updateData = {
    "completion.patientConfirmed": true,
    "completion.patientConfirmedAt": new Date(),
    $push: {
      "completion.completedBy": {
        userId: patientId,
        userType: "patient",
        confirmedAt: new Date(),
      },
    },
  };

  // Check if doctor has already confirmed
  if (request.completion.doctorConfirmed) {
    updateData.status = "completed";
    updateData["timeline.completedAt"] = new Date();

    // Notify both parties that appointment is fully completed
    await Notification.create({
      userId:
        request.doctor && request.doctor._id
          ? request.doctor._id
          : request.doctor,
      docId: requestId,
      docType: "APPOINTMENT",
      action: "APPOINTMENT_COMPLETED",
      title: {
        en: "Appointment Completed",
        fr: "Rendez-vous terminé",
        ar: "تم إكمال الموعد",
      },
      message: {
        en: "The home care appointment has been completed successfully with both confirmations.",
        fr: "Le rendez-vous de soins à domicile a été complété avec succès avec les deux confirmations.",
        ar: "تم إكمال موعد الرعاية المنزلية بنجاح مع تأكيد الطرفين.",
      },
      metadata: { appointmentId: requestId },
    });

    // Sync Balance: Increment Doctor Debt
    await Balance.findOneAndUpdate(
      { doctor: request.doctor && request.doctor._id ? request.doctor._id : request.doctor },
      { 
        $inc: { 
          currentDebt: request.payment.platformFee || 0,
          totalIncome: request.payment.amount || 0
        },
        $set: { lastUpdated: new Date() }
      },
      { upsert: true, new: true }
    );
  } else {
    // Notify doctor that patient has confirmed and waiting for doctor confirmation
    if (request.doctor) {
      await Notification.create({
        userId: (request.doctor && request.doctor._id) ? request.doctor._id : request.doctor,
        docId: requestId,
        docType: "APPOINTMENT",
        action: "APPOINTMENT_UPDATED",
        title: {
          en: "Patient Confirmed Completion",
          fr: "Le patient a confirmé la fin du rendez-vous",
          ar: "المريض أكد إكمال الموعد",
        },
        message: {
          en: "The patient has confirmed the appointment completion. Please confirm to finalize.",
          fr: "Le patient a confirmé la fin du rendez-vous. Veuillez confirmer pour finaliser.",
          ar: "المريض أكد إكمال الموعد. يرجى التأكيد لإتمام العملية.",
        },
        metadata: { appointmentId: requestId },
      });
    }
  }

  return await Appointment.findByIdAndUpdate(requestId, updateData, {
    new: true,
  });
};

// Legacy function - kept for backward compatibility
const completeServiceRequest = async (requestId, professionalId) => {
  const request = await Appointment.findById(requestId).populate("service");
  const doctor = await User.Doctor.findById(professionalId);

  if (!doctor || !request) {
    throw new Error("Unauthorized");
  }

  // Update appointment status
  const updatedAppointment = await Appointment.findByIdAndUpdate(
    requestId,
    {
      status: "completed",
      "timeline.completedAt": new Date(),
      "payment.status": "completed",
      $push: {
        "payment.history": {
          amount: request.payment.amount,
          fee: request.payment.platformFee || 0,
          status: "completed",
          date: new Date(),
          notes: "Payment processed on appointment completion",
        },
      },
    },
    { new: true }
  );

  // Create transaction for the doctor
  const transaction = new Transaction({
    doctor: professionalId,
    patient: request.patient,
    amount: request.payment.amount || 0,
    type: "home-care",
    appointment: requestId,
    status: "completed",
    metadata: {
      serviceType: request.serviceType,
      completedAt: new Date(),
      platformFee: request.payment.platformFee || 0,
    },
  });

  await transaction.save();

  // Sync Balance: Increment Doctor Debt
  await Balance.findOneAndUpdate(
    { doctor: professionalId },
    {
      $inc: {
        currentDebt: request.payment.platformFee || 0,
        totalIncome: request.payment.amount || 0
      },
      $set: { lastUpdated: new Date() }
    },
    { upsert: true, new: true }
  );

  return updatedAppointment;
};

// Submit service report (updated)
const submitServiceReport = async (requestId, professionalId, reportData) => {
  const request = await Appointment.findById(requestId);
  const doctor = await User.Doctor.findById(professionalId);

  if (!doctor || !request) {
    throw new Error("Unauthorized");
  }

  return await Appointment.findByIdAndUpdate(
    requestId,
    {
      consultationNotes: {
        diagnosis: reportData.diagnosis,
        symptoms: reportData.symptoms,
        treatments: reportData.treatments,
        notes: reportData.notes,
        ...(reportData.prescriptions && {
          prescriptions: reportData.prescriptions,
        }),
      },
      status: "completed",
    },
    { new: true }
  );
};

const updateProfessionalLocation = async (
  appointmentId,
  professionalId,
  location
) => {
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    professional: professionalId,
    status: { $in: ["confirmed", "in-progress"] },
  });

  if (!appointment) {
    throw new AppError("No active appointment found", 404);
  }

  return await Appointment.findByIdAndUpdate(
    appointmentId,
    {
      $set: {
        "professionalLocation.gps": [location.lng, location.lat], // GeoJSON format
        "professionalLocation.timestamp": new Date(),
        "professionalLocation.eta": calculateETA(
          location,
          appointment.serviceLocation.gps
        ),
      },
    },
    { new: true }
  );
};

// Get professional's location
const getProfessionalLocation = async (appointmentId) => {
  const appointment = await Appointment.findById(appointmentId)
    .select("professionalLocation serviceLocation")
    .lean();

  if (!appointment?.professionalLocation) {
    throw new AppError("Location data not available", 404);
  }

  return {
    professional: appointment.professionalLocation,
    destination: appointment.serviceLocation,
    distance: calculateDistance(
      appointment.professionalLocation.gps,
      appointment.serviceLocation.gps
    ),
  };
};

// Get payment history and summary for a professional
const getPaymentHistory = async (professionalId) => {
  const appointments = await Appointment.find({
    professional: professionalId,
    "payment.status": { $in: ["completed", "withdrawn"] },
    isHomeCare: true,
  })
    .select("payment patient service serviceType createdAt")
    .populate("patient", "fullName")
    .populate("service", "name")
    .lean();

  // Calculate totals
  const summary = appointments.reduce(
    (acc, appointment) => {
      // Only count non-withdrawn payments for total
      if (appointment.payment.status === "completed") {
        acc.total += appointment.payment.amount || 0;
        acc.fee += appointment.payment.fee || 0;
      }
      return acc;
    },
    { total: 0, fee: 0 }
  );

  return {
    summary,
    history: appointments.map((appointment) => {
      // Handle service arrays
      let serviceName = "Unknown";
      if (Array.isArray(appointment.service)) {
        if (appointment.service.length === 1) {
          serviceName =
            appointment.service[0]?.name ||
            appointment.serviceType ||
            "Unknown";
        } else if (appointment.service.length > 1) {
          serviceName = `${appointment.service[0]?.name || "Service"} (+${
            appointment.service.length - 1
          } more)`;
        }
      } else if (appointment.service?.name) {
        serviceName = appointment.service.name;
      } else {
        serviceName = appointment.serviceType || "Unknown";
      }

      return {
        id: appointment._id,
        patient: appointment.patient?.fullName || "Unknown",
        service: serviceName,
        amount: appointment.payment.amount,
        fee: appointment.payment.fee,
        status: appointment.payment.status,
        date: appointment.createdAt,
        history: appointment.payment.history || [],
      };
    }),
  };
};

// Process payment withdrawal
const withdrawPayment = async (professionalId) => {
  // Find all completed payments for this professional
  const appointments = await Appointment.find({
    professional: professionalId,
    "payment.status": "completed",
    isHomeCare: true,
  });

  if (!appointments.length) {
    throw new AppError("No completed payments found", 404);
  }

  // Calculate total amount to withdraw
  const totalAmount = appointments.reduce((sum, appointment) => {
    return sum + (appointment.payment.amount || 0);
  }, 0);

  const totalFee = appointments.reduce((sum, appointment) => {
    return sum + (appointment.payment.fee || 0);
  }, 0);

  // Update all appointments to withdrawn status
  const updatePromises = appointments.map((appointment) => {
    // Add to payment history
    const historyEntry = {
      amount: appointment.payment.amount,
      fee: appointment.payment.fee,
      status: "withdrawn",
      date: new Date(),
      notes: "Payment withdrawn by professional",
    };

    return Appointment.findByIdAndUpdate(appointment._id, {
      "payment.status": "withdrawn",
      $push: { "payment.history": historyEntry },
    });
  });

  await Promise.all(updatePromises);

  return {
    totalAmount,
    totalFee,
    count: appointments.length,
    withdrawalDate: new Date(),
  };
};

module.exports = {
  listServices,
  createServiceRequest,
  getRequestDetails,
  findAvailableProfessionals,
  acceptServiceRequest,
  completeServiceRequest,
  doctorConfirmCompletion,
  patientConfirmCompletion,
  submitServiceReport,
  updateProfessionalLocation,
  getProfessionalLocation,
  getPaymentHistory,
  withdrawPayment,
};
