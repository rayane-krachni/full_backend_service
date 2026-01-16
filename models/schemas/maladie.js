const { Schema, default: mongoose } = require("mongoose");
const mongooseLeanVirtuals = require("mongoose-lean-virtuals");
const mongooseUniqueValidator = require("mongoose-unique-validator");

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
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
schema.plugin(mongooseUniqueValidator);

module.exports = schema;
