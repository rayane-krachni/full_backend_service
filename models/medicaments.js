const { default: mongoose } = require("mongoose");
const schema = require("./schemas/medicament");

module.exports = mongoose.model("Medicament", schema);
