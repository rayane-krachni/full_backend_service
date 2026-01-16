const { Schema, default: mongoose } = require("mongoose");
const { calculateDistance } = require("../../utils/geo");
const schema = new mongoose.Schema(
  {
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    professional: { type: Schema.Types.ObjectId, ref: "User" },
    service: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    serviceType: {
      type: String,
      enum: ["DOCTOR", "NURSE", "ANALYSIS", "TRANSPORT"],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "rejected",
        "in-progress",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },
    scheduledTime: Date,
    completionTime: Date,
    patientLocation: {
      address: String,
      gps: { lat: Number, lng: Number },
    },
    professionalLocation: {
      // For tracking
      gps: { lat: Number, lng: Number },
      timestamp: Date,
    },
    // Service-specific details
    medicalReport: {
      diagnosis: String,
      symptoms: [String],
      procedures: [String],
      notes: String,
      attachments: [{ url: String, description: String }],
    },
    // For transport
    transportDetails: {
      distance: Number,
      vehicleType: String,
      medicalTeam: Boolean,
    },
    // For analysis
    analysisDetails: {
      type: String,
      results: String,
      lab: String,
    },
    payment: {
      amount: Number,
      fee: Number,
      status: {
        type: String,
        enum: ["pending", "completed", "cancelled"],
        default: "pending",
      },
    },
    rating: { type: Number, min: 1, max: 5 },
    review: String,
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

module.exports = schema;
