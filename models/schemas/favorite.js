// models/publicity.js
const { Schema, default: mongoose } = require("mongoose");
const mongooseLeanVirtuals = require("mongoose-lean-virtuals");
const mongooseUniqueValidator = require("mongoose-unique-validator");

const publicitySchema = new mongoose.Schema(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      maxlength: 500
    },
    isFavorite: {
      type: Boolean,
      default: true
    }
  },
  {
    _id: false,
    timestamps: false
  }
);

publicitySchema.plugin(mongooseLeanVirtuals);
publicitySchema.plugin(mongooseUniqueValidator);

module.exports = publicitySchema;
