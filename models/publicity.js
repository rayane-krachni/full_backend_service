const { default: mongoose } = require("mongoose");
const schema = require("./schemas/publicity");

module.exports = mongoose.model("publicity", schema);
