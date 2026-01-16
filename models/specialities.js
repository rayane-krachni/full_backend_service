const { default: mongoose } = require("mongoose");
const schema = require("./schemas/speciality");

module.exports = mongoose.model("Speciality", schema);
