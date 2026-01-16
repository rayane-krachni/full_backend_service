const { Schema } = require("mongoose");
const mongooseLeanVirtuals = require("mongoose-lean-virtuals");
const mongooseUniqueValidator = require("mongoose-unique-validator");

const employeeSchema = new Schema(
  {
    // Employee-specific fields
    employeeType: {
      type: String,
      enum: ["RECEPTIONIST", "ADMINISTRATOR", "ASSISTANT", "OTHER"],
      required: true,
    },
    associatedDoctor: {
      type: Schema.Types.ObjectId,
      ref: "User", // References Doctor users
    },
    permissions: {
      scheduleManagement: { type: Boolean, default: false },
      patientRecords: { type: Boolean, default: false },
      billing: { type: Boolean, default: false },
      prescriptions: { type: Boolean, default: false },
    },
    workSchedule: [
      {
        day: {
          type: String,
          enum: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
        },
        startTime: String,
        endTime: String,
        isWorking: { type: Boolean, default: true },
      },
    ],
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

employeeSchema.plugin(mongooseLeanVirtuals);
employeeSchema.plugin(mongooseUniqueValidator, {
  message: "La valeur '{VALUE}' du champ #'{PATH}'# est déjà utilisée...",
});

module.exports = employeeSchema;
