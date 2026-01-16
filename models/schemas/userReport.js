const mongoose = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');

const UserReportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reported: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // Optional, in case reporting a general issue, but feature request says "signaled professionals"
    },
    reason: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "RESOLVED", "DISMISSED"],
      default: "PENDING",
    },
  },
  {
    timestamps: true,
  }
);

UserReportSchema.plugin(mongoosePaginate);

module.exports = UserReportSchema;
