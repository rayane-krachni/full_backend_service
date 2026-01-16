const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const util = require("util");
const { FileValidationError } = require("../exceptions");

const doctorDocStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(
      process.cwd(),
      "data",
      "static",
      "public",
      "doctors",
      "documents"
    );
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const doctorId = req.params.id || req.user._id;
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = `doc_${doctorId}_${file.fieldname}_${uniqueSuffix}${ext}`;
    cb(null, filename);
  },
});

const docFileFilter = (req, file, cb) => {
  const validMimetypes = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/octet-stream",
  ];
  const validFieldnames = ["diploma", "licenseScan", "idProof"];

  if (
    validMimetypes.includes(file.mimetype) &&
    validFieldnames.includes(file.fieldname)
  ) {
    cb(null, true);
  } else {
    cb(
      new FileValidationError(file, {
        field: file.fieldname,
        message: "Invalid file type or field name",
        allowedTypes: validMimetypes.join(", "),
        allowedFields: validFieldnames.join(", "),
      })
    );
  }
};

const uploadDoctorDocs = multer({
  storage: doctorDocStorage,
  fileFilter: docFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 3,
  },
}).fields([
  { name: "diploma", maxCount: 1 },
  { name: "licenseScan", maxCount: 1 },
  { name: "idProof", maxCount: 1 },
]);

const handleDoctorDocuments = async (req, res, next) => {
  try {
    await util.promisify(uploadDoctorDocs)(req, res);
    req.documentUpdates = {};

    if (req.files) {
      for (const [fieldname, files] of Object.entries(req.files)) {
        if (files && files[0]) {
          const file = files[0];
          const fileLink = `${req.protocol}://${req.get(
            "host"
          )}/data/static/public/doctors/documents/${file.filename}`;

          // Only process image files for thumbnails
          if (file.mimetype.startsWith("image/")) {
            const thumbDir = path.join(file.destination, "thumbs");
            
            // Create thumbs directory if it doesn't exist
            if (!fs.existsSync(thumbDir)) {
              fs.mkdirSync(thumbDir, { recursive: true });
            }

            const thumbPath = path.join(thumbDir, file.filename);
            try {
              await sharp(file.path)
                .resize(300, 300, { fit: "inside" })
                .jpeg({ quality: 80 })
                .toFile(thumbPath);
            } catch (thumbError) {
              console.error("Thumbnail generation failed:", thumbError);
              // Continue even if thumbnail fails
            }
          }
          console.log(fileLink)
          req.documentUpdates[`${fieldname}`] = fileLink;
        }
      }
    }

    next();
  } catch (error) {
    if (req.files) {
      Object.values(req.files)
        .flat()
        .forEach((file) => {
          if (file && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
    }
    next(error);
  }
};

module.exports = { handleDoctorDocuments };