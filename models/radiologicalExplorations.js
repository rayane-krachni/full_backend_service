const mongoose = require("mongoose");
const schema = require("./schemas/radiologicalExploration");
const plugin = require("mongoose-paginate-v2");

schema.plugin(plugin);

const RadiologicalExploration = mongoose.model("RadiologicalExploration", schema);

module.exports = RadiologicalExploration;
