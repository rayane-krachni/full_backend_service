const { Schema, default: mongoose } = require("mongoose");
const mongooseLeanVirtuals = require("mongoose-lean-virtuals");

const schema = new mongoose.Schema(
  {
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment" },
    medications: [
      {
        name: { type: String, required: true },
        dosage: { type: String },
        frequency: { type: String },
        duration: { type: String },
        qte: { type: String },
        form: { type: String },
      },
    ],
    date: { type: Date, default: Date.now },
    uniqueId: { type: String, unique: true },
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

// Generate uniqueId before saving
schema.pre("save", async function (next) {
  if (!this.uniqueId) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.uniqueId = `ORD-${dateStr}-${randomStr}`;
  }
  next();
});

module.exports = schema;
