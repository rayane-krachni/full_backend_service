const fs = require("node:fs");
const path = require("node:path");
const {
  generateKeypair,
  getPubKey,
  getPrivKey,
  hashPassword,
  keysExist,
} = require("../utils/crypto");
const adminServices = require("../services/admin");
const userServices = require("../services/user");

require("dotenv").config();

if (
  !process.env.NODE_ENV ||
  !process.env.PORT ||
  !process.env.API_PREFIX ||
  !process.env.DB_URL ||
  !process.env.DEFAULT_EMAIL ||
  !process.env.DEFAULT_PASSWORD ||
  !process.env.DEFAULT_FIRSTNAME ||
  !process.env.DEFAULT_LASTNAME ||
  !process.env.MAILING_USER ||
  !process.env.MAILING_PASSWORD ||
  !process.env.MAILING_DEFAULT_FROM_NAME ||
  !process.env.MAILING_DEFAULT_FROM_EMAIL
) {
  console.error("Environment variables missing");
  process.exit(1);
}

//#region private
const privatePath = path.join(process.cwd(), ".private");
fs.mkdirSync(privatePath, { recursive: true });
//#endregion

//#region tmp
const tmpPath = path.join(process.cwd(), ".tmp");
fs.mkdirSync(tmpPath, { recursive: true });
//#endregion

//#region data
const dataPath = path.join(process.cwd(), "data");
const staticPath = path.join(dataPath, "static");
const publicDataPath = path.join(staticPath, "public");
const privateDataPath = path.join(staticPath, "private");
const audioFilesPath = path.join(publicDataPath, "questions", "audioFiles");
const excelsPath = path.join(dataPath, "excels");
fs.mkdirSync(dataPath, { recursive: true });
fs.mkdirSync(publicDataPath, { recursive: true });
fs.mkdirSync(privateDataPath, { recursive: true });
fs.mkdirSync(audioFilesPath, { recursive: true });
fs.mkdirSync(excelsPath, { recursive: true });
//#endregion

require("./db")
  .connectDB()
  .then(async () => {
    try {
      const superAdmins = await adminServices.find({
        filter: { role: "SUPER_ADMIN" },
      });
      if (superAdmins.length === 0) {
        const { passwordHash, passwordSalt } = await hashPassword(
          process.env.DEFAULT_PASSWORD
        );
        await adminServices.create({
          email: process.env.DEFAULT_EMAIL,
          phone: process.env.DEFAULT_PHONE,
          name: process.env.DEFAULT_FIRSTNAME,
          passwordHash,
          passwordSalt,
          role: "SUPER_ADMIN",
        });
        console.log("Super admin created");
      }
      await userServices.createDefaultDoctor();
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });

if (
  process.env.NODE_ENV === "PROD" ||
  (process.env.NODE_ENV === "DEV" && !keysExist())
) {
  generateKeypair();
}

require("./passport");
