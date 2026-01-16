const { Schema, default: mongoose } = require("mongoose");
const mongooseLeanVirtuals = require("mongoose-lean-virtuals");
const mongooseUniqueValidator = require("mongoose-unique-validator");

const doctorSchema = new Schema(
  {
    licenseNumber: { type: String, required: false },
    specialities: [
      {
        type: Schema.Types.ObjectId,
        ref: "Speciality",
        required: false,
      },
    ],
    businessInfo: {
      businessName: { type: String, required: false },
      address: {
        wilaya: String,
        city: String,
        street: String,
        gps: { lat: Number, lng: Number },
      },
      phone: { type: String, required: false },
      practiceType: {
        type: String,
        enum: [
          "CABINET",
          "HOSPITAL",
          "ORGANIZATION",
          "CLINIC",
          "PRIVATE_PRACTICE",
        ],
        required: false,
      },
      services: {
        inPerson: { type: Boolean, default: false },
        remote: { type: Boolean, default: false },
        homeCare: { type: Boolean, default: false },
      },
      description: String,
      consultationFee: Number,
      sessionDuration: Number,
      availability: [
        {
          day: {
            type: String,
            enum: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
          },
          startTime: String,
          endTime: String,
        },
      ],
      unavailability: [
        {
          date: { type: Date, required: true },
          reason: {
            type: String,
            enum: ["VACATION", "SICK_LEAVE", "CONFERENCE", "OTHER"],
            default: "OTHER",
          },
          description: String,
          isRecurring: { type: Boolean, default: false },
          allDay: { type: Boolean, default: true },
          timeSlots: [
            {
              startTime: String,
              endTime: String,
            },
          ],
        },
      ],
      homeCareAvailability: {
        available: Boolean,
        schedule: [
          {
            day: {
              type: String,
              enum: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            },
            startTime: String,
            endTime: String,
          },
        ],
        currentLocation: {
          gps: { lat: Number, lng: Number },
          timestamp: Date,
        },
      },
    },

    documents: {
      diploma: { type: String, required: false },
      licenseScan: { type: String, required: false },
      idProof: { type: String, required: false },
      verificationStatus: {
        diploma: {
          type: String,
          enum: ["PENDING", "APPROVED", "REJECTED"],
          default: "PENDING",
        },
        licenseScan: {
          type: String,
          enum: ["PENDING", "APPROVED", "REJECTED"],
          default: "PENDING",
        },
        idProof: {
          type: String,
          enum: ["PENDING", "APPROVED", "REJECTED"],
          default: "PENDING",
        },
        lastVerifiedAt: Date,
        verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
      },
      rejectionReasons: {
        diploma: String,
        licenseScan: String,
        idProof: String,
      },
    },
    // Add to businessInfo.practiceType enum:
    practiceType: {
      type: String,
      enum: [
        "CABINET",
        "HOSPITAL",
        "CLINIC",
        "PRIVATE_PRACTICE",
        "ORGANIZATION",
      ], // Added ORGANIZATION
      default: "PRIVATE_PRACTICE",
    },

    // Add organization reference (for doctors in hospitals/clinics):
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization", // References another DOCTOR (head of org) or ORGANIZATION
      default: null,
    },
    isIndependent: {
      type: Boolean,
      default: true, // Default to solo practice
    },
    isDefault: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

doctorSchema.plugin(require("mongoose-lean-virtuals"));
doctorSchema.plugin(require("mongoose-unique-validator"), {
  message: "La valeur '{VALUE}' du champ #'{PATH}'# est déjà utilisée...",
});

module.exports = doctorSchema;
