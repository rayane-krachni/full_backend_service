const { default: mongoose } = require("mongoose");
const schema = require("./schemas/maladie");

module.exports = mongoose.model("Maladie", schema);
