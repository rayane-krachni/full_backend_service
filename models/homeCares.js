const { default: mongoose } = require("mongoose");
const schema = require("./schemas/homeCare");

module.exports = mongoose.model("homeCare", schema);
