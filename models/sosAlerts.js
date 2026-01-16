const mongoose = require("mongoose");
const SOSAlertSchema = require("./schemas/sosAlert");

const SOSAlert = mongoose.model("SOSAlert", SOSAlertSchema);

module.exports = SOSAlert;
