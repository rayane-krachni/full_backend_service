const { default: mongoose } = require("mongoose");
const baseSchema = require("./schemas/user");
const patientSchema = require("./schemas/patient");
const professionalSchema = require("./schemas/professional");
const employeeSchema = require("./schemas/employee");

const User = mongoose.model("User", baseSchema);

const Patient = User.discriminator("PATIENT", patientSchema);
const Doctor = User.discriminator("DOCTOR", professionalSchema);
const Employee = User.discriminator("EMPLOYEE", employeeSchema);
const Nurse = User.discriminator("NURSE", professionalSchema);
module.exports = {
  User,
  Patient,
  Doctor,
  Employee,
  Nurse
};