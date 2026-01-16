const multer = require("multer");
const path = require("path");
const fs = require("fs");
const util = require("util");
const { FileValidationError } = require("../exceptions");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(
      process.cwd(),
      "data",
      "static",
      "public",
      "finance",
      "receipts"
    );
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const doctorId = req.user._id;
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = `receipt_${doctorId}_${uniqueSuffix}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  const validMimetypes = ["image/jpeg", "image/png", "application/pdf"];

  if (validMimetypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new FileValidationError(file, {
        field: "receiptImage",
        message: "Invalid file type. Only JPEG, PNG and PDF are allowed.",
      })
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single("receiptImage");

const handleReceiptUpload = async (req, res, next) => {
  try {
    await util.promisify(upload)(req, res);
    
    if (req.file) {
      const fileLink = `${req.protocol}://${req.get(
        "host"
      )}/data/static/public/finance/receipts/${req.file.filename}`;
      
      // Populate req.body with the file link so the controller can use it
      req.body.receiptImage = fileLink;
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { handleReceiptUpload };
