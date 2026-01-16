const { default: mongoose } = require("mongoose");
const { RecordNotFoundError, DataValidationError } = require("../exceptions");
const Model = require("../models/user");
const Speciality = require("../models/specialities");
const Appointment = require("../models/appointments");
const Organization = require("../models/organizations");
const { parseValidatorError } = require("../utils/mongoose");
const moment = require("moment-timezone");
const path = require("path");
const fs = require("fs");
const { hashPassword } = require("../utils/crypto");

const me = async (_id, { returnPassword = false, returnData = false } = {}) => {
  try {
    const result = await Model.User.findById(_id, {
      ...(returnPassword ? {} : { passwordHash: 0, passwordSalt: 0 }),
      ...(returnData ? {} : { password_pin: 0, account_pin: 0, payment: 0 }),
    })
      .populate({
        path: "familyMembers",
        select: "fullName",
      })
      .populate("specialities")
      .lean({ virtuals: true });

    if (!result || result.isDeleted) {
      throw new RecordNotFoundError(Model.User, "_id", _id);
    }

    delete result.isDeleted;
    result.accountType = result.role;

    // Initialize notice object
    result.notice = {
      hasMissingFields: false,
      messages: [],
      isComplete: true,
    };

    // Check required fields based on role
    if (result.role === "PATIENT") {
      const requiredPatientFields = [
        { field: "address.wilaya", name: "Wilaya" },
        { field: "address.city", name: "City" },
        { field: "address.street", name: "Street" },
        { field: "phoneNumber", name: "Phone number" },
      ];

      for (const { field, name } of requiredPatientFields) {
        const fieldParts = field.split(".");
        let value = result;

        for (const part of fieldParts) {
          value = value?.[part];
          if (value === undefined) break;
        }

        if (!value) {
          result.notice.messages.push(`${name} is required`);
          result.notice.hasMissingFields = true;
          result.notice.isComplete = false;
        }
      }
    } else if (result.role === "DOCTOR") {
      // Check business info
      const requiredBusinessFields = [
        { field: "businessInfo.businessName", name: "Business name" },
        {
          field: "businessInfo.availability",
          name: "Availability",
          checkEmptyArray: true,
        },
      ];

      for (const { field, name, checkEmptyArray } of requiredBusinessFields) {
        const fieldParts = field.split(".");
        let value = result;

        for (const part of fieldParts) {
          value = value?.[part];
          if (value === undefined) break;
        }

        if (
          !value ||
          (checkEmptyArray && Array.isArray(value) && value.length === 0)
        ) {
          result.notice.messages.push(`${name} is required`);
          result.notice.hasMissingFields = true;
          result.notice.isComplete = false;
        }
      }

      // Check document verification status
      if (result.documents?.verificationStatus) {
        const requiredDocuments = [
          { field: "diploma", name: "Diploma verification" },
          { field: "licenseScan", name: "License verification" },
          { field: "idProof", name: "ID verification" },
        ];

        for (const { field, name } of requiredDocuments) {
          const status = result.documents.verificationStatus[field];
          if (status !== "APPROVED") {
            result.notice.messages.push(`${name} needs to be approved`);
            result.notice.hasMissingFields = true;
            result.notice.isComplete = false;
          }
        }
      } else {
        result.notice.messages.push("Document verification is required");
      }
    }

    // Check organization status for doctors
    if (result.role === "DOCTOR") {
      const organization = await Organization.findOne({
        $or: [
          { adminDoctor: result._id },
          { members: result._id }
        ],
        isDeleted: false
      });
      
      if (organization) {
        result.isDirector = organization.adminDoctor.toString() === result._id.toString();
        result.organisationId = organization._id;
      } else {
        result.isDirector = false;
        result.organisationId = null;
      }
    }

    return result;
  } catch (error) {
    console.error("Me Error:", error);
    throw error;
  }
};

const findById = async (
  _id,
  { returnPassword = false, returnData = false } = {}
) => {
  const result = await Model.User.findById(_id, {
    ...(returnPassword ? {} : { passwordHash: 0, passwordSalt: 0 }),
    ...(returnData ? {} : { password_pin: 0, account_pin: 0, payment: 0 }),
  })
    .lean({ virtuals: true })
    .populate("familyMembers")
    .exec();

  if (!result || result.isDeleted) {
    throw new RecordNotFoundError(Model.User, "_id", _id);
  }

  delete result.isDeleted;
  return result;
};

const findByEmail = async (email, { returnPassword = false } = {}) => {
  const result = await Model.User.findOne(
    { isDeleted: false, email },
    {
      isDeleted: 0,
      ...(returnPassword ? {} : { passwordHash: 0, passwordSalt: 0 }),
    }
  )
    .lean({ virtuals: true })
    .exec();
  if (!result || result.isDeleted) {
    throw new RecordNotFoundError(Model.User, "email", email);
  }
  delete result.isDeleted;
  return result;
};

const generatePin = async (email, field, { returnPassword = false } = {}) => {
  const user = await Model.User.findOne(
    { isDeleted: false, email },
    {
      isDeleted: 0,
      ...(returnPassword ? {} : { passwordHash: 0, passwordSalt: 0 }),
    }
  )
    .lean({ virtuals: true })
    .exec();

  if (!user) {
    throw new RecordNotFoundError("User", "email", email);
  }

  const pinCode = await generateUniquePin(field);

  let updatedUser = null;
  if (field == "account") {
    updatedUser = await Model.User.findByIdAndUpdate(
      user._id,
      { account_pin: pinCode, pin_expiration: Date.now() + 15 * 60 * 1000 },
      { new: true, fields: { account_pin: 1, email: 1 } }
    )
      .lean()
      .exec();
  } else {
    updatedUser = await Model.User.findByIdAndUpdate(
      user._id,
      {
        isActive: false,
        password_pin: pinCode,
        pin_expiration: Date.now() + 15 * 60 * 1000,
      },
      { new: true, fields: { password_pin: 1, email: 1 } }
    )
      .lean()
      .exec();
  }

  return updatedUser;
};

const generateUniquePin = async (field) => {
  const maxRetries = 5;
  let retries = 0;
  let pin;
  let existingUser = false;
  while (retries < maxRetries) {
    pin = generatePinCode();
    if (field == "account")
      existingUser = await Model.User.findOne({ account_pin: pin })
        .lean()
        .exec();
    else
      existingUser = await Model.User.findOne({ password_pin: pin })
        .lean()
        .exec();

    if (!existingUser) {
      return pin;
    }

    retries++;
  }

  throw new Error("Failed to generate a unique PIN after multiple attempts.");
};

const generatePinCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const find = async ({ filter = {}, pagination = {} }, user) => {
  const baseFilter = {
    isDeleted: false,
    ...filter,
  };

  const total = await Model.User.countDocuments(baseFilter);
  const query = Model.User.find(baseFilter, {
    isDeleted: 0,
    passwordHash: 0,
    passwordSalt: 0,
  }).lean({ virtuals: true });

  if (pagination.skip) query.skip(pagination.skip);
  if (pagination.limit) query.limit(pagination.limit);

  // Optional sorting
  if (filter.sortBy) {
    const sortOrder = filter.sortOrder === "desc" ? -1 : 1;
    query.sort({ [filter.sortBy]: sortOrder });
  }

  const users = await query.exec();

  return {
    users,
    total,
  };
};

const findEmployees = async ({ filter = {}, pagination = {} }, user) => {
  const baseFilter = {
    isDeleted: false,
    ...filter,
  };
  const total = await Model.Employee.countDocuments(baseFilter);
  const query = Model.Employee.find(baseFilter, {
    isDeleted: 0,
    passwordHash: 0,
    passwordSalt: 0,
  }).lean({ virtuals: true });

  if (pagination.skip) query.skip(pagination.skip);
  if (pagination.limit) query.limit(pagination.limit);

  if (filter.sortBy) {
    const sortOrder = filter.sortOrder === "desc" ? -1 : 1;
    query.sort({ [filter.sortBy]: sortOrder });
  }

  const users = await query.exec();

  return {
    users,
    total,
  };
};

const createDefaultDoctor = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Get all specialities
    const specialities = await Speciality.find({}).lean();
    const specialityIds = specialities.map((s) => s._id);

    // Hash the password
    const { passwordHash, passwordSalt } = await hashPassword("test");

    // Doctor data
    const doctorData = {
      licenseNumber: "MD-MEDEA-98765",
      specialities: specialityIds,
      businessInfo: {
        businessName: "Sahti Team",
        address: {
          wilaya: "Blida",
          city: "Blida",
          street: "Rue des Orangers",
          gps: {
            lat: 36.4701,
            lng: 2.8287,
          },
        },
        practiceType: "PRIVATE_PRACTICE",
        services: {
          inPerson: true,
          remote: true,
          homeCare: true,
        },
        description: "Neurology specialist with 15 years experience",
        consultationFee: 5000,
        sessionDuration: 60,
        availability: [],
        unavailability: [],
      },
      documents: {
        diploma: "",
        licenseScan: "",
        idProof: "",
        rejectionReasons: {},
        verificationStatus: {
          diploma: "APPROVED",
          licenseScan: "APPROVED",
          idProof: "PENDING",
        },
      },
      isVerified: true,
      email: "sahti@email.local",
      role: "DOCTOR",
      fullName: "sahti",
      picture:
        "http://127.0.0.1:8080/data/static/public/users/default.webp",
      language: "fr",
      account_pin: 0,
      password_pin: 0,
      isTrial: false,
      isActive: true,
      isDeleted: false,
      isDefault: true,
      passwordHash,
      passwordSalt,
    };

    // Check if default doctor already exists
    const existingDefault = await Model.Doctor.findOne({
      isDefault: true,
      isDeleted: false,
    });
    if (existingDefault) {
      return;
    }

    // Check if doctor with this email exists
    const existingDoctor = await Model.Doctor.findOne({
      email: doctorData.email,
      isDeleted: false,
    });

    if (existingDoctor) {
      // Update existing doctor to be default
      await Model.Doctor.updateOne(
        { _id: existingDoctor._id },
        {
          $set: {
            isDefault: true,
            ...doctorData,
            passwordHash,
            passwordSalt,
          },
        }
      );
    } else {
      // Create new default doctor
      const doctor = new Model.Doctor(doctorData);
      await doctor.save();
      return true;
    }

    return true;
  } catch (error) {
    return false;
  }
};

const createUser = async (data) => {
  const requiredFields = ["email", "passwordHash", "fullName", "role"];
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`${field} is required`);
    }
  }
  let userData = {
    email: data.email,
    passwordHash: data.passwordHash,
    passwordSalt: data.passwordSalt,
    fullName: data.fullName,
    role: data.role,
    isActive: data.isActive ? data.isActive : false,
    isDeleted: false,
    language: "fr",
    account_pin: 0,
    password_pin: 0,
    isTrial: true,
    ...(data.phoneNumber && { phoneNumber: data.phoneNumber }),
    ...(data.picture && { picture: data.picture }),
  };
  if (data.responsibleId) {
    userData = {
      ...userData,
      responsibleId: data.responsibleId,
      isFamilyAccount: false,
      role: "PATIENT",
    };
  }
  if (data.associatedDoctor) {
    userData = {
      ...userData,
      associatedDoctor: data.associatedDoctor,
      employeeType: data.employeeType,
      role: "EMPLOYEE",
    };
  }

  if (data.role === "DOCTOR" || data.role === "NURSE") {
    userData.licenseNumber = null;
    userData.specialities = [];
    userData.businessInfo = {
      businessName: "",
      practiceType: "CLINIC",
      services: {
        remote: false,
        inPerson: false,
        homeCare: false,
      },
      consultationFee: 0,
      description: "",
      availability: null,
      ...(data.businessInfo || {}),
    };
    userData.isVerified = false;
    userData.documents = {
      diploma: "",
      licenseScan: "",
      idProof: "",
    };
  } else if (data.role === "PATIENT") {
    userData.medicalInfo = {
      medicalInfo: {
        birthDate: null,
        height: 0,
        weight: 0,
        bloodType: "A+",
        chronicDiseases: [],
        allergies: [],
        medications: [],
      },

      familyMembers: [],

      notificationPreferences: {
        appointmentReminders: false,
        prescriptionUpdates: false,
        promoOffers: false,
      },
    };
  }
  let user;
  switch (data.role) {
    case "DOCTOR":
      user = new Model.Doctor(userData);
      break;
    case "NURSE":
      user = new Model.Nurse(userData);
      break;
    case "PATIENT":
      user = new Model.Patient(userData);
      break;
    case "EMPLOYEE":
      user = new Model.Employee(userData);
      break;
    default:
      throw new Error("Invalid role specified");
  }
  await user.validate().catch((validationError) => {
    throw validationError;
  });
  await user.save();
  let result = user.toObject({
    virtuals: true,
    transform: (doc, ret) => {
      delete ret.passwordHash;
      delete ret.passwordSalt;
      delete ret.isDeleted;
      return ret;
    },
  });
  return result;
};

const associateFamilyMember = async (responsibleId, newUserId) => {
  try {
    let user = await Model.User.findById(responsibleId).lean();
    if (!user) throw new Error("User not found");

    const UserModel = user.__t
      ? Model.User.discriminators[user.__t]
      : Model.User;
    user = await UserModel.findById(responsibleId);
    if (!user) throw new Error("User not found");

    if (user.role !== "PATIENT") {
      throw new Error("Only patients can have family members.");
    }

    user.familyMembers = user.familyMembers || [];

    if (newUserId) {
      const familyMember = await Model.User.findById(newUserId);
      if (!familyMember) throw new Error("Family member not found");

      user.familyMembers.push(familyMember._id);
      user.markModified("familyMembers");
    }

    try {
      await user.validate();
    } catch (validationError) {
      console.error("Validation Error Details:", validationError);
      throw validationError;
    }

    const updatedUser = await user.save();
    return updatedUser.toObject({
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.passwordSalt;
        delete ret.isDeleted;
        return ret;
      },
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const errors = Object.fromEntries(
        Object.entries(error.errors).map(([k, v]) => [k, v.message])
      );
      throw {
        status: 400,
        message: "Validation failed",
        details: errors,
      };
    }

    throw error;
  }
};

const getFamilyMembers = async (userId) => {
  try {
    // Find the user and their family member IDs
    const user = await Model.User.findById(userId)
      .select("familyMembers role")
      .populate({
        path: "familyMembers",
        select: "_id fullName email phone picture role", // Customize fields you want
        options: { lean: true }, // Return plain JS objects
      })
      .lean();
    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "PATIENT") {
      throw new Error("Only patients can have family members");
    }

    // Return the populated family members array
    return user.familyMembers || [];
  } catch (error) {
    console.error("Error fetching family members:", error);

    if (error instanceof mongoose.Error.ValidationError) {
      const errors = Object.fromEntries(
        Object.entries(error.errors).map(([k, v]) => [k, v.message])
      );
      throw {
        status: 400,
        message: "Validation failed",
        details: errors,
      };
    }

    throw {
      status: 500,
      message: "Error retrieving family members",
      details: error.message,
    };
  }
};

const create = async (data) => {
  try {
    const newUser = await createUser(data);

    if (data.responsibleId) {
      await associateFamilyMember(data.responsibleId, newUser.id);
    }

    return newUser;
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const errors = {};
      Object.keys(error.errors).forEach((key) => {
        errors[key] = error.errors[key].message;
      });
      return { status: 400, message: "Validation failed", errors };
    } else if (error.code === 11000) {
      // Handle MongoDB duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return {
        status: 400,
        message: "Validation failed",
        errors: { [field]: `The ${field} '${value}' is already in use by another user.` }
      };
    }
    return error;
  }
};

const setupProfile = async (req) => {
  try {
    let user = await Model.User.findById(req.user._id).lean();
    if (!user) throw new Error("User not found");
    const UserModel = user.__t
      ? Model.User.discriminators[user.__t]
      : Model.User;
    user = await UserModel.findById(req.user._id);
    if (!user) throw new Error("User not found");

    // Common fields for all users
    if (req.body.fullName !== undefined) {
      user.fullName = req.body.fullName;
      user.markModified("fullName");
    }

    if (req.body.picture !== undefined) {
      user.picture = req.body.picture;
      user.markModified("picture");
    }

    // Doctor-specific updates
    if (user.role === "DOCTOR" || user.role === "NURSE") {
      // License number update
      if (req.body.licenseNumber !== undefined) {
        user.licenseNumber = req.body.licenseNumber;
        user.markModified("licenseNumber");
      }

      // Specialities update
      if (req.body.specialities !== undefined) {
        user.specialities = req.body.specialities;
        user.markModified("specialities");
      }

      // Business Info updates
      if (req.body.businessInfo !== undefined) {
        user.businessInfo = user.businessInfo || {};

        // Basic business info
        if (req.body.businessInfo.businessName !== undefined) {
          user.businessInfo.businessName = req.body.businessInfo.businessName;
          user.markModified("businessInfo.businessName");
        }
        if (req.body.businessInfo.phone !== undefined) {
          user.businessInfo.phone = req.body.businessInfo.phone;
          user.markModified("businessInfo.phone");
        }
        if (req.body.businessInfo.practiceType !== undefined) {
          user.businessInfo.practiceType = req.body.businessInfo.practiceType;
          user.markModified("businessInfo.practiceType");
        }

        if (req.body.businessInfo.description !== undefined) {
          user.businessInfo.description = req.body.businessInfo.description;
          user.markModified("businessInfo.description");
        }

        if (req.body.businessInfo.consultationFee !== undefined) {
          user.businessInfo.consultationFee =
            req.body.businessInfo.consultationFee;
          user.markModified("businessInfo.consultationFee");
        }

        if (req.body.businessInfo.sessionDuration !== undefined) {
          user.businessInfo.sessionDuration =
            req.body.businessInfo.sessionDuration;
          user.markModified("businessInfo.sessionDuration");
        }

        // Address updates
        if (req.body.businessInfo.address !== undefined) {
          user.businessInfo.address = user.businessInfo.address || {};

          if (req.body.businessInfo.address.wilaya !== undefined) {
            user.businessInfo.address.wilaya =
              req.body.businessInfo.address.wilaya;
            user.markModified("businessInfo.address.wilaya");
          }

          if (req.body.businessInfo.address.city !== undefined) {
            user.businessInfo.address.city = req.body.businessInfo.address.city;
            user.markModified("businessInfo.address.city");
          }

          if (req.body.businessInfo.address.street !== undefined) {
            user.businessInfo.address.street =
              req.body.businessInfo.address.street;
            user.markModified("businessInfo.address.street");
          }

          if (req.body.businessInfo.address.gps !== undefined) {
            user.businessInfo.address.gps = req.body.businessInfo.address.gps;
            user.markModified("businessInfo.address.gps");
          }
        }

        // Services updates
        if (req.body.businessInfo.services !== undefined) {
          user.businessInfo.services = user.businessInfo.services || {};

          if (req.body.businessInfo.services.inPerson !== undefined) {
            user.businessInfo.services.inPerson =
              req.body.businessInfo.services.inPerson;
            user.markModified("businessInfo.services.inPerson");
          }

          if (req.body.businessInfo.services.remote !== undefined) {
            user.businessInfo.services.remote =
              req.body.businessInfo.services.remote;
            user.markModified("businessInfo.services.remote");
          }

          if (req.body.businessInfo.services.homeCare !== undefined) {
            user.businessInfo.services.homeCare =
              req.body.businessInfo.services.homeCare;
            user.markModified("businessInfo.services.homeCare");
          }
        }
        // Home care availability updates
        if (req.body.businessInfo.homeCareAvailability !== undefined) {
          user.businessInfo.homeCareAvailability =
            user.businessInfo.homeCareAvailability || {};

          if (
            req.body.businessInfo.homeCareAvailability.available !== undefined
          ) {
            user.businessInfo.homeCareAvailability.available =
              req.body.businessInfo.homeCareAvailability.available;
            user.markModified("businessInfo.homeCareAvailability.available");
          }

          if (
            req.body.businessInfo.homeCareAvailability.schedule !== undefined
          ) {
            const dayMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            const processedSchedule = req.body.businessInfo.homeCareAvailability.schedule.map(item => ({
              ...item,
              day: typeof item.day === 'number' ? dayMap[item.day] : item.day
            }));
            user.businessInfo.homeCareAvailability.schedule = processedSchedule;
            user.markModified("businessInfo.homeCareAvailability.schedule");
          }

          if (
            req.body.businessInfo.homeCareAvailability.currentLocation !==
            undefined
          ) {
            user.businessInfo.homeCareAvailability.currentLocation = {
              gps: req.body.businessInfo.homeCareAvailability.currentLocation
                .gps,
              timestamp: new Date(),
            };
            user.markModified(
              "businessInfo.homeCareAvailability.currentLocation"
            );
          }
        }

        // Unavailability updates (existing logic)
        if (req.body.businessInfo.unavailability !== undefined) {
          const processedUnavailability = [];

          req.body.businessInfo.unavailability.forEach((item) => {
            const baseUnavailability = {
              date: new Date(item.date),
              reason: item.reason || "OTHER",
              description: item.description || "",
              isRecurring: item.isRecurring || false,
              allDay: item.allDay !== false, // Default to true
            };

            if (!baseUnavailability.allDay && item.timeSlots) {
              baseUnavailability.timeSlots = item.timeSlots.map((slot) => ({
                startTime: slot.startTime,
                endTime: slot.endTime,
              }));
            }

            if (item.is_repetitive) {
              for (let day = 0; day < 7; day++) {
                const dateCopy = new Date(baseUnavailability.date);
                dateCopy.setDate(
                  dateCopy.getDate() + (day - dateCopy.getDay())
                );

                const repetitiveItem = {
                  ...baseUnavailability,
                  date: dateCopy,
                  originalDate: baseUnavailability.date,
                };

                processedUnavailability.push(repetitiveItem);
              }
            } else {
              processedUnavailability.push(baseUnavailability);
            }
          });

          const now = new Date();
          const invalidDates = processedUnavailability.filter(
            (item) => item.date < now
          );
          if (invalidDates.length > 0) {
            return {
              success: false,
              message: "Cannot set unavailability for past dates",
              error: "PAST_DATE_ERROR",
              invalidDates: invalidDates.map(item => item.date)
            };
          }

          user.businessInfo.unavailability = processedUnavailability;
          user.markModified("businessInfo.unavailability");
        }

        // Availability updates (existing logic)
        if (req.body.businessInfo.availability !== undefined) {
          const processedAvailability = [];
          const dayMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

          req.body.businessInfo.availability.forEach((item) => {
            const baseAvailability = {
              day: typeof item.day === 'number' ? dayMap[item.day] : item.day,
              startTime: item.startTime,
              endTime: item.endTime,
            };

            if (item.is_repetitive) {
              for (let day = 0; day < 7; day++) {
                processedAvailability.push({
                  ...baseAvailability,
                  day: dayMap[day],
                  originalDay: baseAvailability.day,
                });
              }
            } else {
              processedAvailability.push(baseAvailability);
            }
          });

          user.businessInfo.availability = processedAvailability;
          user.markModified("businessInfo.availability");
        }
      }

      // Documents updates
      // In your setupProfile function, replace the documents section with this:
      if (req.documentUpdates) {
        // Initialize documents object if it doesn't exist
        user.documents = user.documents || {
          diploma: null,
          licenseScan: null,
          idProof: null,
          verificationStatus: {
            diploma: "PENDING",
            licenseScan: "PENDING",
            idProof: "PENDING",
            lastVerifiedAt: null,
            verifiedBy: null,
          },
        };

        // Apply updates from the middleware
        if (req.documentUpdates) {
          // Update document links
          if (req.documentUpdates.diploma !== undefined) {
            user.documents.diploma = req.documentUpdates.diploma;
            user.documents.verificationStatus.diploma = "PENDING";
            user.markModified("documents.diploma");
          }

          if (req.documentUpdates.licenseScan !== undefined) {
            user.documents.licenseScan = req.documentUpdates.licenseScan;
            user.documents.verificationStatus.licenseScan = "PENDING";
            user.markModified("documents.licenseScan");
          }

          if (req.documentUpdates.idProof !== undefined) {
            user.documents.idProof = req.documentUpdates.idProof;
            user.documents.verificationStatus.idProof = "PENDING";
            user.markModified("documents.idProof");
          }

          // Update thumbnails/previews if they exist
          if (req.documentUpdates.diplomaThumbnail) {
            user.documents.diplomaThumbnail =
              req.documentUpdates.diplomaThumbnail;
            user.markModified("documents.diplomaThumbnail");
          }

          if (req.documentUpdates.licenseScanThumbnail) {
            user.documents.licenseScanThumbnail =
              req.documentUpdates.licenseScanThumbnail;
            user.markModified("documents.licenseScanThumbnail");
          }

          if (req.documentUpdates.idProofThumbnail) {
            user.documents.idProofThumbnail =
              req.documentUpdates.idProofThumbnail;
            user.markModified("documents.idProofThumbnail");
          }

          // Update verification status
          user.documents.verificationStatus.lastVerifiedAt = null;
          user.documents.verificationStatus.verifiedBy = null;
          user.markModified("documents.verificationStatus");
        }
      }
      // Keep the existing manual document updates for cases where files aren't uploaded
      if (req.body.documents !== undefined) {
        user.documents = user.documents || {};

        if (req.body.documents.diploma !== undefined) {
          user.documents.diploma = req.body.documents.diploma;
          user.markModified("documents.diploma");
        }

        if (req.body.documents.licenseScan !== undefined) {
          user.documents.licenseScan = req.body.documents.licenseScan;
          user.markModified("documents.licenseScan");
        }

        if (req.body.documents.idProof !== undefined) {
          user.documents.idProof = req.body.documents.idProof;
          user.markModified("documents.idProof");
        }
      }

      // Organization updates
      if (req.body.organizationId !== undefined) {
        user.organizationId = req.body.organizationId;
        user.markModified("organizationId");

        if (req.body.organizationId) {
          user.isIndependent = false;
          user.markModified("isIndependent");
        } else {
          user.isIndependent = true;
          user.markModified("isIndependent");
        }
      }

      if (req.body.isIndependent !== undefined) {
        user.isIndependent = req.body.isIndependent;
        user.markModified("isIndependent");
      }

      if (req.body.isDefault !== undefined) {
        user.isDefault = req.body.isDefault;
        user.markModified("isDefault");
      }
    } else if (user.role === "PATIENT") {
      // Initialize patient-specific subdocuments if they don't exist
      user.medicalInfo = user.medicalInfo || {
        birthDate: null,
        height: null,
        weight: null,
        bloodType: null,
        chronicDiseases: [],
        allergies: [],
        medications: [],
      };

      user.notificationPreferences = user.notificationPreferences || {
        appointmentReminders: false,
        prescriptionUpdates: false,
        promoOffers: false,
      };

      // Medical Info updates
      if (req.body.medicalInfo !== undefined) {
        // Basic medical info
        if (req.body.medicalInfo.birthDate !== undefined) {
          user.medicalInfo.birthDate = new Date(req.body.medicalInfo.birthDate);
          user.markModified("medicalInfo.birthDate");
        }

        if (req.body.medicalInfo.height !== undefined) {
          user.medicalInfo.height = req.body.medicalInfo.height;
          user.markModified("medicalInfo.height");
        }

        if (req.body.medicalInfo.weight !== undefined) {
          user.medicalInfo.weight = req.body.medicalInfo.weight;
          user.markModified("medicalInfo.weight");
        }

        if (req.body.medicalInfo.bloodType !== undefined) {
          user.medicalInfo.bloodType = req.body.medicalInfo.bloodType;
          user.markModified("medicalInfo.bloodType");
        }

        // Arrays handling
        if (req.body.medicalInfo.chronicDiseases !== undefined) {
          user.medicalInfo.chronicDiseases =
            req.body.medicalInfo.chronicDiseases;
          user.markModified("medicalInfo.chronicDiseases");
        }

        if (req.body.medicalInfo.allergies !== undefined) {
          user.medicalInfo.allergies = req.body.medicalInfo.allergies;
          user.markModified("medicalInfo.allergies");
        }

        // Medications array with sub-documents
        if (req.body.medicalInfo.medications !== undefined) {
          user.medicalInfo.medications = req.body.medicalInfo.medications.map(
            (med) => ({
              name: med.name,
              dosage: med.dosage || "",
              frequency: med.frequency || "",
            })
          );
          user.markModified("medicalInfo.medications");
        }
      }

      // Notification Preferences updates
      if (req.body.notificationPreferences !== undefined) {
        if (
          req.body.notificationPreferences.appointmentReminders !== undefined
        ) {
          user.notificationPreferences.appointmentReminders =
            req.body.notificationPreferences.appointmentReminders;
          user.markModified("notificationPreferences.appointmentReminders");
        }

        if (
          req.body.notificationPreferences.prescriptionUpdates !== undefined
        ) {
          user.notificationPreferences.prescriptionUpdates =
            req.body.notificationPreferences.prescriptionUpdates;
          user.markModified("notificationPreferences.prescriptionUpdates");
        }

        if (req.body.notificationPreferences.promoOffers !== undefined) {
          user.notificationPreferences.promoOffers =
            req.body.notificationPreferences.promoOffers;
          user.markModified("notificationPreferences.promoOffers");
        }
      }

      // Family Members updates (if exists in your actual schema)
      if (req.body.familyMembers !== undefined) {
        user.familyMembers = req.body.familyMembers;
        user.markModified("familyMembers");
      }
    }
    // Validation and save
    try {
      await user.validate();
    } catch (validationError) {
      console.error("Validation Error Details:", validationError);
      throw validationError;
    }

    const updatedUser = await user.save();

    let result = updatedUser.toObject({
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.passwordSalt;
        delete ret.isDeleted;
        return ret;
      },
    });

    return result;
  } catch (error) {
    console.error("Profile Update Error:", error);

    if (error instanceof mongoose.Error.ValidationError) {
      const errors = Object.fromEntries(
        Object.entries(error.errors).map(([k, v]) => [k, v.message])
      );
      throw {
        status: 400,
        message: "Validation failed",
        details: errors,
      };
    }

    throw error;
  }
};

const getDoctorCalendar = async (doctorId, timezone = "CET") => {
  try {
    // 1. Get doctor with availability and unavailability
    const doctor = await Model.Doctor.findById(doctorId)
      .select(
        "businessInfo.availability businessInfo.unavailability businessInfo.sessionDuration"
      )
      .lean();

    if (!doctor) {
      throw new Error("Doctor not found");
    }

    const {
      availability = [],
      unavailability = [],
      sessionDuration = 30,
    } = doctor.businessInfo;

    // 2. Generate next 30 days
    const calendar = [];
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    const timeZoneOffset = moment().tz(timezone).format("Z");

    // Get all appointments for this doctor in the next 30 days
    const startDate = new Date(tomorrow);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(tomorrow);
    endDate.setDate(tomorrow.getDate() + 30);
    endDate.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      doctor: doctorId,
      date: {
        $gte: startDate.toISOString().split("T")[0],
        $lte: endDate.toISOString().split("T")[0],
      },
      status: { $nin: ["cancelled", "rescheduled"] },
      isDeleted: { $ne: true },
    }).lean();

    // Create a map of booked slots for quick lookup
    const bookedSlotsMap = new Map();
    appointments.forEach((appt) => {
      const dateStr = appt.date.toISOString().split("T")[0];
      const timeStr = appt.time.substring(0, 5); // Ensure format is "HH:MM"

      if (!bookedSlotsMap.has(dateStr)) {
        bookedSlotsMap.set(dateStr, new Set());
      }
      bookedSlotsMap.get(dateStr).add(timeStr);
    });
    for (let i = 0; i < 30; i++) {
      const date = new Date(tomorrow);
      date.setDate(tomorrow.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const dayOfWeek = date
        .toLocaleDateString("en-US", { weekday: "short" })
        .toUpperCase();
      const dateStr = date.toISOString().split("T")[0];

      // Find weekly availability for this day
      const dayAvailability = availability.find((a) => a.day === dayOfWeek);

      // Check for unavailability on this specific date
      const dayUnavailability = unavailability.find((u) => {
        const unavailDate = new Date(u.date).toISOString().split("T")[0];
        return unavailDate === dateStr;
      });

      // Determine if day is open
      let isOpen = false;
      let timeSlots = [];

      if (dayAvailability && !dayUnavailability) {
        // Day is normally available and not blocked
        isOpen = true;
        timeSlots = splitIntoAppointmentSlots(
          dayAvailability.startTime,
          dayAvailability.endTime,
          sessionDuration
        );
      } else if (dayUnavailability && !dayUnavailability.allDay) {
        // Day has partial unavailability
        const availableSlots = calculateAvailableSlots(
          dayAvailability,
          dayUnavailability
        );
        isOpen = availableSlots.length > 0;
        timeSlots = availableSlots.flatMap((slot) =>
          splitIntoAppointmentSlots(
            slot.startTime,
            slot.endTime,
            sessionDuration
          )
        );
      }

      // Check availability for each time slot
      const dateBookedSlots = bookedSlotsMap.get(dateStr) || new Set();
      const finalTimeSlots = timeSlots.map((slot) => {
        const isAvailable = !dateBookedSlots.has(slot.startTime);
        return {
          startTime: slot.startTime,
          endTime: slot.endTime,
          isAvailable,
        };
      });

      calendar.push({
        date: dateStr,
        dayOfWeek,
        isOpen,
        timeSlots: finalTimeSlots,
        timeZone: timezone,
        timeZoneOffset,
      });
    }

    return calendar;
  } catch (error) {
    console.error("Error generating doctor calendar:", error);
    throw error;
  }
};

function splitIntoAppointmentSlots(startTime, endTime, durationMinutes) {
  const slots = [];
  const [startHours, startMins] = startTime.split(":").map(Number);
  const [endHours, endMins] = endTime.split(":").map(Number);

  let currentHours = startHours;
  let currentMins = startMins;
  const endTotalMins = endHours * 60 + endMins;

  while (true) {
    const currentTotalMins = currentHours * 60 + currentMins;
    if (currentTotalMins >= endTotalMins) break;

    const nextTotalMins = currentTotalMins + durationMinutes;
    if (nextTotalMins > endTotalMins) break;

    const nextHours = Math.floor(nextTotalMins / 60);
    const nextMins = nextTotalMins % 60;

    slots.push({
      startTime: `${currentHours.toString().padStart(2, "0")}:${currentMins
        .toString()
        .padStart(2, "0")}`,
      endTime: `${nextHours.toString().padStart(2, "0")}:${nextMins
        .toString()
        .padStart(2, "0")}`,
    });

    currentHours = nextHours;
    currentMins = nextMins;
  }

  return slots;
}

// Helper function to calculate available slots when there's partial unavailability
function calculateAvailableSlots(dayAvailability, dayUnavailability) {
  if (!dayAvailability) return [];

  const availableSlots = [];
  const dayStart = dayAvailability.startTime;
  const dayEnd = dayAvailability.endTime;

  // Convert times to minutes for easier comparison
  const toMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const dayStartMin = toMinutes(dayStart);
  const dayEndMin = toMinutes(dayEnd);

  // Sort unavailability slots by start time
  const blockedSlots = dayUnavailability.timeSlots
    .map((slot) => ({
      start: toMinutes(slot.startTime),
      end: toMinutes(slot.endTime),
    }))
    .sort((a, b) => a.start - b.start);

  // Find available slots between blocked periods
  let currentStart = dayStartMin;

  for (const blocked of blockedSlots) {
    if (blocked.start > currentStart) {
      // There's an available slot before this blocked period
      availableSlots.push({
        startTime: minutesToTime(currentStart),
        endTime: minutesToTime(blocked.start),
      });
    }
    currentStart = Math.max(currentStart, blocked.end);
  }

  // Add remaining time after last blocked slot
  if (currentStart < dayEndMin) {
    availableSlots.push({
      startTime: minutesToTime(currentStart),
      endTime: dayEnd,
    });
  }

  return availableSlots;
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}

const updateById = async (_id, data) => {
  try {
    const result = await Model.User.findOneAndUpdate(
      { _id, isDeleted: false },
      data,
      {
        new: true,
        runValidators: true,
        fields: { isDeleted: 0, passwordHash: 0, passwordSalt: 0 },
      }
    ).lean({ virtuals: true });

    if (!result) {
      throw new RecordNotFoundError(Model.User, "_id", _id);
    }
    return result;
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      throw new DataValidationError(Model.User, parseValidatorError(error));
    } else if (error.code === 11000) {
      // Handle MongoDB duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      const duplicateError = [{
        field: field,
        message: `The ${field} '${value}' is already in use by another user.`
      }];
      throw new DataValidationError(Model.User, duplicateError);
    } else {
      console.error("Error updating document:", error);
      throw error;
    }
  }
};

const updatePasswordById = async (_id, keys, data) => {
  try {
    const result = await Model.User.findOneAndUpdate(
      { _id, isDeleted: false, password_pin: keys.pin },
      data,
      {
        new: true,
        runValidators: true,
        fields: { isDeleted: 0, passwordHash: 0, passwordSalt: 0 },
      }
    ).lean({ virtuals: true });
    if (!result) {
      throw new RecordNotFoundError(Model.User, "_id", keys.id);
    }
    return result;
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      throw new DataValidationError(Model.User, parseValidatorError(error));
    } else if (error.code === 11000) {
      // Handle MongoDB duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      const duplicateError = [{
        field: field,
        message: `The ${field} '${value}' is already in use by another user.`
      }];
      throw new DataValidationError(Model.User, duplicateError);
    } else {
      throw error;
    }
  }
};

const activateAccount = async (keys) => {
  const _id = keys.id;
  const result = await Model.User.findOneAndUpdate(
    { _id, isDeleted: false, isActive: false, account_pin: keys.pin },
    { isActive: true, account_pin: 0 },
    {
      new: true,
      runValidators: true,
      fields: { isDeleted: 0, passwordHash: 0, passwordSalt: 0 },
    }
  ).lean({ virtuals: true });
  if (!result) {
    throw new RecordNotFoundError(Model.User, "_id", _id);
  }
  return result;
};

const activateById = async (_id) => {
  const result = await Model.User.findOneAndUpdate(
    { _id, isDeleted: false, isActive: false },
    { isActive: true },
    {
      new: true,
      runValidators: true,
      fields: { isDeleted: 0, passwordHash: 0, passwordSalt: 0 },
    }
  ).lean({ virtuals: true });
  if (!result) {
    throw new RecordNotFoundError(Model.User, "_id", _id);
  }
  return result;
};

const deactivateById = async (_id) => {
  const result = await Model.User.findOneAndUpdate(
    { _id, isDeleted: false, isActive: true },
    { isActive: false },
    {
      new: true,
      runValidators: true,
      fields: { isDeleted: 0, passwordHash: 0, passwordSalt: 0 },
    }
  ).lean({ virtuals: true });
  if (!result) {
    throw new RecordNotFoundError(Model.User, "_id", _id);
  }
  return result;
};

const deleteById = async (docId, reqUserId) => {
  const userResult = await Model.User.findByIdAndDelete(docId).lean();
  if (!userResult) {
    throw new RecordNotFoundError(Model.User, "_id", docId);
  }

  return userResult;
};

const editFamilyMember = async (responsibleId, memberId, updateData) => {
  try {
    const responsibleUser = await Model.User.findById(responsibleId);
    if (!responsibleUser) {
      throw new Error("Responsible user not found");
    }

    const familyMember = await Model.User.findOne({
      id: memberId,
      responsibleId: responsibleId.toString(),
    });

    if (!familyMember) {
      throw new Error(
        "Family member not found or not associated with this user"
      );
    }
    const restrictedFields = ["role", "responsibleId", "isFamilyAccount"];
    restrictedFields.forEach((field) => {
      if (updateData[field]) {
        throw new Error(`Cannot modify ${field} for family members`);
      }
    });

    Object.assign(familyMember, updateData);

    await familyMember.validate();

    const updatedMember = await familyMember.save();

    return updatedMember.toObject({
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.passwordSalt;
        delete ret.isDeleted;
        return ret;
      },
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const errors = Object.fromEntries(
        Object.entries(error.errors).map(([k, v]) => [k, v.message])
      );
      throw {
        status: 400,
        message: "Validation failed",
        details: errors,
      };
    } else if (error.code === 11000) {
      // Handle MongoDB duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      throw {
        status: 400,
        message: "Validation failed",
        details: { [field]: `The ${field} '${value}' is already in use by another user.` }
      };
    }
    throw error;
  }
};
const deleteFamilyMember = async (responsibleId, memberId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const responsibleUser = await Model.User.findById(responsibleId).session(
      session
    );
    if (!responsibleUser) {
      throw new Error("Responsible user not found");
    }
    const familyMember = await Model.User.findOne({
      _id: memberId,
      responsibleId: responsibleId,
    }).session(session);

    if (!familyMember) {
      throw new Error(
        "Family member not found or not associated with this user"
      );
    }

    responsibleUser.familyMembers.pull(memberId);
    await responsibleUser.save({ session });

    await Model.User.deleteOne({ _id: memberId }).session(session);

    await session.commitTransaction();

    return {
      success: true,
      deletedMemberId: memberId,
      responsibleUserId: responsibleId,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  activateAccount,
  updatePasswordById,
  generatePin,
  findById,
  findByEmail,
  find,
  create,
  updateById,
  activateById,
  deactivateById,
  deleteById,
  me,
  setupProfile,
  getFamilyMembers,
  editFamilyMember,
  deleteFamilyMember,
  getDoctorCalendar,
  createDefaultDoctor,
  findEmployees,
};
