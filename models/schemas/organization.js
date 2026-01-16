// models/organization.js
const { Schema, default: mongoose } = require("mongoose");
const moment = require("moment");
const mongooseLeanVirtuals = require("mongoose-lean-virtuals");
const mongooseUniqueValidator = require("mongoose-unique-validator");
const schema = new mongoose.Schema({
  name: String,
  type: { type: String, enum: ["HOSPITAL", "CLINIC", "ORGANISATION"] },
  adminDoctor: { type: Schema.Types.ObjectId, ref: "User" }, // Main admin
  members: [{ type: Schema.Types.ObjectId, ref: "User" }], // All doctors/nurses
  picture: String,
  address: {
    wilaya: String,
    city: String,
    street: String,
    gps: { lat: Number, lng: Number },
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    // validate: {
    //   validator: function (v) {
    //     return this.phoneNumber ? true : !!v;
    //   },
    //   message: "Email or phone number is required",
    // },
  },
  phoneNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  isActive: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  lastLogin: Date,
});

// schema.plugin(mongooseIdValidator);
schema.plugin(mongooseLeanVirtuals);
schema.plugin(mongooseUniqueValidator);

module.exports = schema;