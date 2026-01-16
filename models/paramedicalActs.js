const mongoose = require("mongoose");
const schema = require("./schemas/paramedicalAct");
const plugin = require("mongoose-paginate-v2");

schema.plugin(plugin);

const ParamedicalAct = mongoose.model("ParamedicalAct", schema);

module.exports = ParamedicalAct;
