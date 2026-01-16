const service = require("../services/homeCare");
const { handleError, catchAsync, AppError } = require("../utils/errors");

// Get all available services with filters
const getServices = async (req, res, next) => {
  try {
    const result = await service.listServices(req.query);

    // Get user's language preference (default to 'fr')
    const userLanguage = req.user?.language || "fr";

    // Transform the result to return language-specific fields
    const transformedResult = result.map((serviceItem) => {
      const transformed = { ...serviceItem };

      // Transform name field
      if (serviceItem.name && typeof serviceItem.name === "object") {
        transformed.name =
          serviceItem.name[userLanguage] ||
          serviceItem.name.fr ||
          serviceItem.name;
      }

      // Transform description field
      if (
        serviceItem.description &&
        typeof serviceItem.description === "object"
      ) {
        transformed.description =
          serviceItem.description[userLanguage] ||
          serviceItem.description.fr ||
          serviceItem.description;
      }

      // Transform category field
      if (serviceItem.category && typeof serviceItem.category === "object") {
        transformed.category =
          serviceItem.category[userLanguage] ||
          serviceItem.category.fr ||
          serviceItem.category;
      }

      return transformed;
    });

    res.json(transformedResult);
  } catch (error) {
    next(error);
  }
};

// Create new home care request
const createRequest = async (req, res, next) => {
  try {
    const requestData = {
      ...req.body,
      patient: req.user._id.toString(),
    };
    const result = await service.createServiceRequest(requestData);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

// Get request details
const getRequestDetails = async (req, res, next) => {
  try {
    const result = await service.getRequestDetails(req.params.id, req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// List available professionals
const getAvailableProfessionals = async (req, res, next) => {
  try {
    const result = await service.findAvailableProfessionals({
      ...req.query,
      patientLocation: req.user.address?.gps,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Professional accepts request
const acceptRequest = async (req, res, next) => {
  try {
    const result = await service.acceptServiceRequest(
      req.params.id,
      req.user._id
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Doctor confirms completion (first key)
const doctorConfirmCompletion = async (req, res, next) => {
  try {
    const result = await service.doctorConfirmCompletion(
      req.params.id,
      req.user._id
    );
    if (result.success == false) {
      res.status(400).json(result);
    } else {
      res.status(200).json({
        success: true,
        message:
          "Doctor confirmation recorded. Waiting for patient confirmation.",
        appointment: result,
      });
    }
  } catch (error) {
    next(error);
  }
};

// Patient confirms completion (second key)
const patientConfirmCompletion = async (req, res, next) => {
  try {
    const result = await service.patientConfirmCompletion(
      req.params.id,
      req.user._id
    );
    if (result.success == false) {
      res.status(400).json(result);
    } else {
      res.status(200).json({
        success: true,
        message:
          result.status === "completed"
            ? "Appointment completed successfully with both confirmations."
            : "Patient confirmation recorded. Waiting for doctor confirmation.",
        appointment: result,
      });
    }
  } catch (error) {
    next(error);
  }
};

// Mark service as complete (legacy - kept for backward compatibility)
const completeRequest = async (req, res, next) => {
  try {
    const result = await service.completeServiceRequest(
      req.params.id,
      req.user._id
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Submit service report
const submitReport = async (req, res, next) => {
  try {
    const result = await service.submitServiceReport(
      req.params.id,
      req.user._id,
      req.body
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const updateLocation = catchAsync(async (req, res) => {
  const { id: appointmentId } = req.params;
  const { lat, lng } = req.body;
  const professionalId = req.user._id;

  const updatedAppointment = await service.updateProfessionalLocation(
    appointmentId,
    professionalId,
    { lat, lng }
  );

  res.status(200).json({
    status: "success",
    data: {
      location: updatedAppointment.professionalLocation,
    },
  });
});

// Get current location
const getLocation = catchAsync(async (req, res) => {
  const location = await service.getProfessionalLocation(req.params.id);
  res.status(200).json({
    status: "success",
    data: location,
  });
});

module.exports = {
  getServices,
  createRequest,
  getRequestDetails,
  getAvailableProfessionals,
  acceptRequest,
  completeRequest,
  doctorConfirmCompletion,
  patientConfirmCompletion,
  submitReport,
  updateLocation,
  getLocation,
};
