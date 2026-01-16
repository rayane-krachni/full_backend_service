const { Schema, default: mongoose } = require("mongoose");
const moment = require("moment");
const mongooseLeanVirtuals = require("mongoose-lean-virtuals");
const mongooseUniqueValidator = require("mongoose-unique-validator");

const schema = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    docId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    docType: {
      type: String,
      required: true,
      enum: ["APPOINTMENT", "MESSAGE", "WITHDRAWAL", "ORGANIZATION", "SOS_ALERT"],
    },
    action: {
      type: String,
      required: true,
      enum: [
        "APPOINTMENT_CREATED",
        "APPOINTMENT_UPDATED",
        "APPOINTMENT_ACCEPTED",
        "APPOINTMENT_REJECTED",
        "APPOINTMENT_COMPLETED",
        "APPOINTMENT_DOCTOR_ASSIGNED",
        "APPOINTMENT_NEXT_PATIENT",
        "MESSAGE_RECEIVED",
        "WITHDRAWAL_APPROVED",
        "WITHDRAWAL_PROCESSED",
        "SOS_ALERT"
      ],
    },
    message: {
      en: {
        type: String,
        required: true,
      },
      ar: {
        type: String,
        required: true,
      },
      fr: {
        type: String,
        required: true,
      },
    },
    title: {
      en: {
        type: String,
        required: true,
      },
      ar: {
        type: String,
        required: true,
      },
      fr: {
        type: String,
        required: true,
      },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    readAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isDeleted: {
      type: Boolean,
      required: [true, "Le statut supprimé est obligatoire."],
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// Compound indexes for efficient querying
schema.index({ userId: 1, createdAt: -1 });
schema.index({ userId: 1, isRead: 1 });

schema.plugin(mongooseLeanVirtuals);
schema.plugin(mongooseUniqueValidator);

module.exports = schema;
