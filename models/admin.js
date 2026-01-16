const { default: mongoose } = require("mongoose");
const schema = require("./schemas/admin");

module.exports = mongoose.model("Admin", schema);
