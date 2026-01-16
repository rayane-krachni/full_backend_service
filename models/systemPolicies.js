const mongoose = require("mongoose");
const schema = require("./schemas/systemPolicy");

const SystemPolicy = mongoose.model("SystemPolicy", schema);

module.exports = SystemPolicy;
