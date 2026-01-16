const { Schema, default: mongoose } = require("mongoose");

const schema = new mongoose.Schema(
  {
    doctor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    patient: { type: Schema.Types.ObjectId, ref: "User" },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: ["consultation", "home-care", "withdrawal", "refund", "payment", "manual-correction"],
      required: true,
    },
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment" },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "requested", "approved", "rejected"],
      default: "pending",
    },
    metadata: { type: Object },
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

module.exports = schema;
