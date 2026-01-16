const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const util = require("util");
const { FileValidationError } = require("../exceptions");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'data', 'static', 'public', 'publicity');
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

// const path = require('path');

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = /^image\/(png|jpe?g|webp)$/;
    const allowedExtensions = /\.(png|jpe?g|webp)$/i;

    if (allowedMimeTypes.test(file.mimetype) || allowedExtensions.test(path.extname(file.originalname))) {
        cb(null, true);
    } else {
        cb(
            new FileValidationError(file, {
                field: "picture",
                message: "Nous acceptons uniquement les images (PNG, JPEG, JPG).",
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
                // req.data.picture = await image.toBuffer();
                const fileLink = `${req.protocol}://${req.get('host')}/data/static/public/publicity/${req.file.filename}`;
                req.data.picture = fileLink;
                // req.data.picture = await image.toBuffer();
                // req.data.width = metadata.width;
                // req.data.height = metadata.height;
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
