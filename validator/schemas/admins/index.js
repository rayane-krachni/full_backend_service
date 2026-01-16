const enums = require("../../../static/public/enums/admin.json");
const create = require("./create.json");
const patch = require("./patch.json");
const changePassword = require("./changePassword.json");
const forgotPassword = require("./forgotPassword.json");
const resetPassword = require("./resetPassword.json");

create.properties.role.pattern = `^(${enums.role
  .map((e) => `(${e.value})`)
  .join("|")})$`;
patch.properties.role.pattern = `^(${enums.role
  .map((e) => `(${e.value})`)
  .join("|")})$`;

module.exports = {
  create,
  patch,
  changePassword,
  forgotPassword,
  resetPassword,
};
