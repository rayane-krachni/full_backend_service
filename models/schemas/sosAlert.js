const mongoose = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');

const SOSAlertSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
    },
    location: {
      lat: Number,
      lng: Number,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "RESOLVED"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

SOSAlertSchema.plugin(mongoosePaginate);

module.exports = SOSAlertSchema;
