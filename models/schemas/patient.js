const { Schema, default: mongoose } = require("mongoose");
const mongooseLeanVirtuals = require("mongoose-lean-virtuals");
const mongooseUniqueValidator = require("mongoose-unique-validator");
const favoriteDoctorSchema = require("./favorite");
const patientSchema = new Schema(
  {
    medicalInfo: {
      birthDate: Date,
      height: Number,
      weight: Number,
      bloodType: {
        type: String,
        enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
        required: false,
      },
      chronicDiseases: [String],
      allergies: [String],
      medications: [
        {
          name: String,
          dosage: String,
          frequency: String,
        },
      ],
    },

    notificationPreferences: {
      appointmentReminders: { type: Boolean, default: false },
      prescriptionUpdates: { type: Boolean, default: false },
      promoOffers: { type: Boolean, default: false },
    },
    favoriteDoctors: [favoriteDoctorSchema],
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// patientSchema.plugin(require("mongoose-id-validator"), {
//   message: "invalid_reference_{PATH}".toLowerCase(),
// });
patientSchema.plugin(require("mongoose-lean-virtuals"));
patientSchema.plugin(require("mongoose-unique-validator"), {
  message: "La valeur '{VALUE}' du champ #'{PATH}'# est déjà utilisée..."
});
module.exports = patientSchema;
