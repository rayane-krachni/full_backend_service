class FileValidationError extends Error {
  constructor(file, { field, message }) {
    super(message ?? "File Validation Error");
    this.file = file;
    this.field = field;
  }
}

module.exports = FileValidationError;
