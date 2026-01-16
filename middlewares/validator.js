const { DataValidationError } = require("../exceptions");
const fs = require("node:fs");
const ajv = require("../validator");
const localizeFr = require("ajv-i18n/localize/fr");
const { parseAjvErrors } = require("../utils/ajv");

const validator = (resource, action) => (req, res, next) => {
  if (!resource || !action) {
    next(new Error());
    return;
  }
  
  const validate = ajv.getSchema(`${resource}-${action}`);
  if (!req.data) {
    req.data = req.body ?? {};
  }
  if (validate(req.data)) {
    next();
  } else {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    let errors = validate.errors;
    if (req.files) {
      Object.keys(req.files).forEach(async (field) => {
        try {
          fs.unlinkSync(req.files[field][0].path);
        } catch (error) {}
      });
    }
    localizeFr(errors);
    next(new DataValidationError(null, parseAjvErrors(errors)));
  }
};

module.exports = validator;
