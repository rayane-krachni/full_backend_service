const { Schema } = require("mongoose");

const schema = new Schema(
  {
    type: {
      type: String,
      enum: ["TERMS", "PRIVACY", "PAYMENT", "COOKIES"],
      required: true,
      unique: true,
    },
    content: {
      type: String,
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

module.exports = schema;
