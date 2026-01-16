const { Schema, default: mongoose } = require("mongoose");

const schema = new mongoose.Schema(
  {
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    doctor: { type: Schema.Types.ObjectId, ref: "User", required: false },
    business: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
    },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    queueOrder: { type: Number, default: 0 }, // For manual reordering in waiting room
    reason: {
      type: Schema.Types.Mixed,
      required: true,
      validate: {
        validator: function (value) {
          return mongoose.isValidObjectId(value) || typeof value === "string";
        },
        message: "Reason must be either a valid ObjectId or text string",
      },
    },
    status: {
      type: String,
      enum: [
        "requested",
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "rescheduled",
        "in-progress",
      ],
      default: "pending",
    },
    qrCode: { type: String, default: "" },
    consultationNotes: {
      diagnosis: String,
      symptoms: [String],
      treatments:[String],
      summary: String,
      actionsTaken: [String],
      notes: [String],
      documents: [{ url: String, description: String }],
    },
    preConsultation: {
      bloodPressure: String,
      weight: Number,
      sugarLevel: String,
      height: Number,
      temperature: Number
    },
    homeCareStatus: {
      isAccepted: { type: Boolean, default: false },
      arrivalTime: { type: Date },
      completionTime: { type: Date },
    },
    isRemote: { type: Boolean, default: false },
    isPresent: { type: Boolean, default: false },
    isHomeCare: { type: Boolean, default: false },
    notes: { type: String },
    documents: [
      {
        url: String,
        description: String,
      },
    ],
    // Service field supports both single service and multiple services
    service: [{ type: Schema.Types.ObjectId, ref: "Service" }],
    
    serviceType: {
      type: String,
      enum: ["CLINIC", "HOME_DOCTOR", "HOME_NURSE", "ANALYSIS", "TRANSPORT"],
      default: "CLINIC",
    },

    serviceLocation: {
      address: String,
      gps: { lat: Number, lng: Number },
    },

    professionalLocation: {
      gps: { lat: Number, lng: Number },
      timestamp: Date,
      eta: Number,
    },

    serviceDetails: {
      transport: {
        vehicleType: String,
        requiresMedicalTeam: Boolean,
        distance: Number,
      },
      analysis: {
        testType: String,
        sampleCollected: Boolean,
      },
    },

    timeline: {
      requestedAt: { type: Date, default: Date.now },
      acceptedAt: Date,
      arrivedAt: Date,
      completedAt: Date,
    },
    
    // Two-key validation for completion
    completion: {
      doctorConfirmed: { type: Boolean, default: false },
      patientConfirmed: { type: Boolean, default: false },
      doctorConfirmedAt: Date,
      patientConfirmedAt: Date,
      completedBy: [{
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        userType: { type: String, enum: ["doctor", "patient"] },
        confirmedAt: { type: Date, default: Date.now }
      }]
    },
    isDeleted: {
      type: Boolean,
      required: [true, "Le statut est obligatoire."],
      default: false,
    },
    payment: {
      status: {
        type: String,
        enum: ["pending", "completed", "withdrawn", "refunded"],
        default: "pending"
      },
      amount: { type: Number },
      estimatedAmount: { type: Number }, // Total estimated amount for all services
      platformFee: { type: Number }, // Platform fee calculation
      servicesBreakdown: [{ // Breakdown of each service cost
        service: { type: Schema.Types.ObjectId, ref: "Service" },
        basePrice: { type: Number },
        fee: { type: Number }
      }],
      history: [
        {
          amount: Number,
          fee: Number,
          status: String,
          date: { type: Date, default: Date.now },
          notes: String
        }
      ],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);
schema.virtual("reasonDetails", {
  ref: "Reason",
  localField: "reason",
  foreignField: "_id",
  justOne: true,
  options: {
    match: {
      isDeleted: false,
    },
  },
});
schema.index({ patient: 1, scheduledAt: 1 });
schema.index({ professional: 1, status: 1 });
schema.index({ "address.gps": "2dsphere" });
schema.set("toJSON", { virtuals: true });
schema.set("toObject", { virtuals: true });
module.exports = schema;
