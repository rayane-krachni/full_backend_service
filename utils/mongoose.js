const parseValidatorError = (error) => {
  const issues = [];
  if (error.errors) {
    for (let key in error.errors) {
      issues.push({ key, ...error.errors[key].properties });
    }
  } else if (error.message) {
    issues.push(error.message);
  } else {
    issues.push("Unknown Error");
  }
  return issues;
};

module.exports = { parseValidatorError };
