const { translateField } = require("../utils/translating");

class DataValidationError extends Error {
  constructor(model, issues) {
    let message =
      "Validation Errors :\n" +
      Object.values(issues)
        .map((error, index) => `\t[ERR-${index}]${error.message}`)
        .join("\n");
    super(message);
    this.model = model;
    this.issues = Object.values(
      issues.map((issue) => ({
        ...issue,
        message: issue.message.replace(/#'[a-zA-Z0-9]+'#/g, (m, m1, m2) => {
          return `'${translateField(m.split("'")[1])}'`;
        }),
      }))
    );
  }
}

module.exports = DataValidationError;
