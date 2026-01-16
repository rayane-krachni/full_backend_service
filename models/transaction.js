const { default: mongoose } = require("mongoose");
const schema = require("./schemas/transaction");

module.exports = mongoose.model("Transaction", schema);
