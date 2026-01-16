const { Schema, default: mongoose } = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      required: true,
      enum: ["PATIENT", "DOCTOR"],
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      refConditions: {
        isDeleted: false,
      },
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      refConditions: {
        isDeleted: false,
      },
    },
    text: { type: String, required: false },
    attachments: [
      {
        type: {
          type: String,
          enum: ["image", "pdf"],
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        filename: String,
        size: Number,
        thumbnail: String,
      },
    ],
    isSeen: { type: Boolean, required: true, default: false },
    isDeleted: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

messageSchema.index({ doctor: 1, patient: 1 });
messageSchema.index({ createdAt: -1 });

messageSchema.pre("save", function (next) {
  if (this.doctor.equals(this.receiver)) {
    throw new Error("Cannot send message to yourself");
  }
  if (this.patient.equals(this.receiver)) {
    throw new Error("Cannot send message to yourself");
  }
  next();
});

module.exports = messageSchema;
