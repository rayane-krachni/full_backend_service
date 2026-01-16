class RecordNotFoundError extends Error {
  constructor(model, idField, id) {
    let message = `No record with the ${idField} '${id}' was found in ${model.collection.name} collection`;
    super(message);
    this.model = model;
    this.idField = idField;
    this.id = id;
  }
}

module.exports = RecordNotFoundError;
