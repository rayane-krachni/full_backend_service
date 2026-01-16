const { default: mongoose } = require("mongoose");
const schema = require("./schemas/service");

module.exports = mongoose.model("Service", schema);
