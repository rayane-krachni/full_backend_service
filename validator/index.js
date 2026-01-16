const { default: Ajv } = require("ajv");
const adminsSchema = require("./schemas/admins");
const usersSchema = require("./schemas/users");
const categoriesSchema = require("./schemas/categories");

const ajv = new Ajv({ coerceTypes: true, allErrors: true, messages: false });

ajv.addSchema(adminsSchema.create, "ADMINS-CREATE");
ajv.addSchema(adminsSchema.patch, "ADMINS-PATCH");
ajv.addSchema(adminsSchema.changePassword, "ADMINS-CHANGE_PASSWORD");
ajv.addSchema(adminsSchema.forgotPassword, "ADMINS-FORGOT_PASSWORD");
ajv.addSchema(adminsSchema.resetPassword, "ADMINS-RESET_PASSWORD");

ajv.addSchema(usersSchema.create, "USERS-CREATE");
ajv.addSchema(usersSchema.patch, "USERS-PATCH");
ajv.addSchema(usersSchema.changePassword, "USERS-CHANGE_PASSWORD");
ajv.addSchema(usersSchema.forgotPassword, "USERS-FORGOT_PASSWORD");
ajv.addSchema(usersSchema.resetPassword, "USERS-RESET_PASSWORD");

ajv.addSchema(categoriesSchema.create, "CATEGORIES-CREATE");
ajv.addSchema(categoriesSchema.create, "CATEGORIES-PATCH");

module.exports = ajv;
