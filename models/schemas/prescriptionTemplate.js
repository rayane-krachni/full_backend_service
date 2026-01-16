const { Schema, default: mongoose } = require("mongoose");
const mongooseLeanVirtuals = require("mongoose-lean-virtuals");

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    doctor: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    medicaments: [
      {
        name: { type: String, required: true },
        dosage: { type: String },
        frequency: { type: String },
        duration: { type: String },
        qte: { type: String },
        form: { type: String },
      },
    ],
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

schema.plugin(mongooseLeanVirtuals);

module.exports = schema;
