const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/temp/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMime = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "image/webp",
    "image/heic",
    "image/heif",
    "application/octet-stream" // fallback for mobile uploads
  ];

  const allowedExt = [".jpg", ".jpeg", ".png", ".gif", ".pdf", ".webp", ".heic", ".heif"];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMime.includes(file.mimetype) && allowedExt.includes(ext)) {
    cb(null, true);
  } else if (file.mimetype === "application/octet-stream" && allowedExt.includes(ext)) {
    // Handle misreported mimetypes from mobile
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images and PDFs are allowed."), false);
  }
};


const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Create a middleware that handles both 'attachments' and 'attachments[]' field names
const uploadAttachments = (req, res, next) => {
  // Use multer's fields method to handle both possible field names
  const uploadMiddleware = upload.fields([
    { name: "attachments", maxCount: 5 },
    { name: "attachments[]", maxCount: 5 },
  ]);

  uploadMiddleware(req, res, (err) => {
    if (err) {
      return next(err);
    }

    // Normalize the files to req.files array for backward compatibility
    if (req.files) {
      if (req.files["attachments"]) {
        req.files = req.files["attachments"];
      } else if (req.files["attachments[]"]) {
        req.files = req.files["attachments[]"];
      } else {
        req.files = [];
      }
    }

    next();
  });
};

module.exports = {
  upload,
  uploadAttachments,
};
