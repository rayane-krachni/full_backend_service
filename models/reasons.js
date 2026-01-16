const { default: mongoose } = require("mongoose");
const schema = require("./schemas/reason");

module.exports = mongoose.model("Reason", schema);
