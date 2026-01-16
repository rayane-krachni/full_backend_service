const { default: mongoose } = require("mongoose");
const schema = require("./schemas/organization");

module.exports = mongoose.model("Organization", schema);
