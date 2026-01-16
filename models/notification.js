const { default: mongoose } = require("mongoose");
const schema = require("./schemas/notification");

module.exports = mongoose.model("Notification", schema);
