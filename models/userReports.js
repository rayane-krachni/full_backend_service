const mongoose = require("mongoose");
const UserReportSchema = require("./schemas/userReport");

const UserReport = mongoose.model("UserReport", UserReportSchema);

module.exports = UserReport;
