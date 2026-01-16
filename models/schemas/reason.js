const { Schema, default: mongoose } = require("mongoose");
const schema = new mongoose.Schema(
  {
    name: {
      ar: { type: String, required: true },
      fr: { type: String, required: true },
      en: { type: String, required: true }
    },
    speciality: { type: Schema.Types.ObjectId, ref: "Speciality", required: true },
    description: {
      ar: { type: String },
      fr: { type: String },
      en: { type: String }
    },
    picture: {
      type: String,
      required: false,
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
