const { default: mongoose } = require("mongoose");
const schema = require("./schemas/message");

module.exports = mongoose.model("Message", schema);
