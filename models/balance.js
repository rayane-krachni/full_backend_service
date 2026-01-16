const mongoose = require("mongoose");
const schema = require("./schemas/balance");

module.exports = mongoose.model("Balance", schema);
