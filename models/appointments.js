const { default: mongoose } = require("mongoose");
const schema = require("./schemas/appointment");

module.exports = mongoose.model("Appointments", schema);
