const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const util = require("util");
const { FileValidationError } = require("../exceptions");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'data', 'static', 'public', 'users');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = `product_picture_${uniqueSuffix}${ext}`;
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
  if (/^image\/(png)|(jpe?g)$/.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new FileValidationError(file, {
        field: "picture",
        message: "Invalid file mimetype",
      })
    );
  }
};

const upload = util.promisify(
  multer({ storage, fileFilter }).single("picture")
);

const handlePicture = async (req, res, next) => {
  try {
    await upload(req, res);
    req.data = req.body ?? {};
    if (req.file && req.file.fieldname === "picture") {
      try {
        const fileLink = `${req.protocol}://${req.get('host')}/data/static/public/users/${req.file.filename}`;
        req.data.picture = fileLink;
        // req.data.picture = await sharp(req.file.path)
        //   .resize(300, 300, { fit: "inside" })
        //   .webp({ lossless: false, quality: 70 })
        //   .toBuffer();
        next();
      } catch (error) {
        next(error);
      }
    } else {
      next();
    }
  } catch (error) {
    next(error);
  } finally {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
  }
};

module.exports = { handlePicture };
