const parseAjvErrors = (errors) => {
  const additionalProperties = [];
  const requiredProperties = [];
  const newErrors = [];
  errors.forEach((error) => {
    let newError = {};
    let path = error.instancePath.split("/").slice(1);
    switch (error.keyword) {
      case "type":
        newError.kind = error.keyword;
        newError.fieldType = error.params.type;
        if (/\d+/.test(path[path.length - 1])) {
          newError.path = path[path.length - 2];
          newError.message = `la valeur de chaque element du champ ${newError.path} ${error.message}`;
        } else {
          newError.path = path[path.length - 1];
          newError.message = `la valeur du champ ${newError.path} ${error.message}`;
        }
        newErrors.push(newError);
        break;
      case "minimum":
      case "maximum":
      case "exclusiveMinimum":
      case "exclusiveMaximum":
      case "minItems":
      case "maxItems":
        newError.kind = error.keyword;
        newError.path = path[path.length - 1];
        newError[error.keyword] = error.params.limit;
        newError.message = `la valeur du champ ${newError.path} ${error.message}`;
        newErrors.push(newError);
        break;
      case "pattern":
        newError.kind = error.keyword;
        newError.path = path[path.length - 1];
        newError.pattern = error.params.pattern;
        newError.message = `la valeur du champ ${newError.path} ${error.message}`;
        newErrors.push(newError);
        break;
      case "required":
        requiredProperties.push(error.params.missingProperty);
        break;
      case "additionalProperties":
        additionalProperties.push(error.params.additionalProperty);
        break;
    }
  });
  if (additionalProperties.length > 0) {
    newErrors.push({
      kind: "additionalProperties",
      additionalProperties,
      message: "Il existe des propriétés additionnelles",
    });
  }
  if (requiredProperties.length > 0) {
    newErrors.push({
      kind: "requiredProperties",
      requiredProperties,
      message: `Les proprietés suivantes sont obligatoires: ${requiredProperties.join(
        ", "
      )}`,
    });
  }
  return newErrors;
};

module.exports = {
  parseAjvErrors,
};
