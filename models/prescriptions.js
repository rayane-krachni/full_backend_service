const { default: mongoose } = require("mongoose");
const schema = require("./schemas/prescription");

module.exports = mongoose.model("Prescription", schema);
