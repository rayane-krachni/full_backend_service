const fields = {
  title: "titre",
};

const translateField = (field) => {
  return fields[field] ?? field;
};

module.exports = { translateField };
