const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const util = require("util");
const { FileValidationError } = require("../exceptions");

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), "data", "static", "public", "appointments");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = `appointment_doc_${uniqueSuffix}${ext}`;
    cb(null, filename);
  },
});

// File filter for documents (PDF, images, videos)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/pdf",
    "video/mp4",
    "video/quicktime",
  ];
  const allowedExtensions = /\.(png|jpe?g|webp|pdf|mp4|mov)$/i;

  if (
    allowedMimeTypes.includes(file.mimetype) ||
    allowedExtensions.test(path.extname(file.originalname))
  ) {
    cb(null, true);
  } else {
    cb(
      new FileValidationError(file, {
        field: "documents",
        message: "Only PDFs, images (PNG/JPEG/WEBP), or videos (MP4/MOV) are allowed.",
      })
    );
  }
};

// Multer upload (supports multiple files)
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
}).array("documents", 5); // Max 5 files

const handleDocuments = async (req, res, next) => {
  try {
    await util.promisify(upload)(req, res);

    if (req.files && req.files.length > 0) {
      req.body.documents = req.files.map((file) => ({
        url: `${req.protocol}://${req.get("host")}/data/static/public/appointments/${file.filename}`,
        description: file.originalname,
      }));
    }

    next();
  } catch (error) {
    if (req.files) {
      req.files.forEach((file) => {
        fs.unlinkSync(file.path);
      });
    }
    next(error);
  }
};

module.exports = { handleDocuments };