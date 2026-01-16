const { Schema, default: mongoose } = require("mongoose");
const mongooseLeanVirtuals = require("mongoose-lean-virtuals");
const mongooseUniqueValidator = require("mongoose-unique-validator");
const schema = new mongoose.Schema(
  {
    name: {
      ar: { type: String, required: true },
      fr: { type: String, required: true },
      en: { type: String, required: true }
    },
    description: {
      ar: { type: String },
      fr: { type: String },
      en: { type: String }
    },
    picture: {
      type: String,
      required: false,
    },
    category: {
      type: String,
      enum: ["MEDICAL", "SURGICAL", "DIAGNOSTIC", "NURSING", "OTHER"],
    },
    isDeleted: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);
module.exports = schema;
