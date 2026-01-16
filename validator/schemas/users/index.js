const enums = require("../../../static/public/enums/user.json");
const create = require("./create.json");
const add = require("./add.json");
const patch = require("./patch.json");
const changePassword = require("./changePassword.json");
const forgotPassword = require("./forgotPassword.json");
const resetPassword = require("./resetPassword.json");

module.exports = {
  create,
  add,
  patch,
  changePassword,
  forgotPassword,
  resetPassword,
};
