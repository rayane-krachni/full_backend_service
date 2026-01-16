const {
  DataValidationError,
  RecordNotFoundError,
  FileValidationError,
} = require("../exceptions");

const errorHandler = (error, req, res, next) => {
  console.log(error);
  try {
    if (error instanceof RecordNotFoundError) {
      res.status(404).json({ success: false, message: error.message });
    } else if (error instanceof DataValidationError) {
      res.status(400).json({ success: false, message: error.message });
    } else if (error instanceof FileValidationError) {
      res.status(400).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = errorHandler;
