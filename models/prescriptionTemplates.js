const { default: mongoose } = require("mongoose");
const schema = require("./schemas/prescriptionTemplate");

module.exports = mongoose.model("PrescriptionTemplate", schema);
