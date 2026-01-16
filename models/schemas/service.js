const { Schema, default: mongoose } = require("mongoose");

const moment = require("moment");
const mongooseLeanVirtuals = require("mongoose-lean-virtuals");
const mongooseUniqueValidator = require("mongoose-unique-validator");

const schema = new mongoose.Schema(
  {
    name: {
      ar: { type: String, required: true },
      fr: { type: String, required: true },
      en: { type: String, required: true }
    },
    type: {
      type: String,
      enum: ["DOCTOR", "NURSE", "ANALYSIS", "TRANSPORT"],
      required: true,
    },
    category: {
      ar: { type: String },
      fr: { type: String },
      en: { type: String }
    },
    basePrice: { type: Number, required: true },
    fee: { type: Number, required: true },
    description: {
      ar: { type: String },
      fr: { type: String },
      en: { type: String }
    },
    speciality: { type: Schema.Types.ObjectId, ref: "Speciality" }, // For doctor services
    timeSensitive: { type: Boolean, default: false }, // For day/night pricing
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

schema.plugin(mongooseLeanVirtuals);
schema.plugin(mongooseUniqueValidator);

module.exports = schema;
