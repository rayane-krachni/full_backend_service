const { default: mongoose } = require("mongoose");
const schema = require("./schemas/certificate");

module.exports = mongoose.model("Certificate", schema);
