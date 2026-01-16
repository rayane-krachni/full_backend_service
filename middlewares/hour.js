const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const util = require("util");
const { FileValidationError } = require("../exceptions");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'data', 'static', 'public', 'frames');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = `frame_picture_${uniqueSuffix}${ext}`;
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
        await upload(req, res)
        req.data = req.body ?? {};
        if (req.file && req.file.fieldname === "picture") {
            try {
                const image = sharp(req.file.path);
                const metadata = await image.metadata();
                req.data.picture = await image.toBuffer();
                const fileLink = `${req.protocol}://${req.get('host')}/data/static/public/frames/${req.file.filename}`;
                req.data.link = fileLink;
                // req.data.picture = await image.toBuffer();
                req.data.width = metadata.width;
                req.data.height = metadata.height;
                next();
            } catch (error) {
                next(error);
            }
        } else {
            next();
        }
    } catch (error) {
        next(error);
    }
};



module.exports = { handlePicture };
