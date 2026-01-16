const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const jsonwebtoken = require("jsonwebtoken");
const fsPromises = require("fs/promises");
const { generate: generatePassword } = require("generate-password");

const generateKeypair = () => {
  const keyPair = crypto.generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: "pkcs1",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs1",
      format: "pem",
    },
  });

  fs.writeFileSync(
    path.join(process.cwd(), ".private", ".id_rsa_pub.pem"),
    keyPair.publicKey
  );

  fs.writeFileSync(
    path.join(process.cwd(), ".private", ".id_rsa_priv.pem"),
    keyPair.privateKey
  );
};

const getPrivKey = () => {
  const pathToKey = path.join(process.cwd(), ".private", ".id_rsa_priv.pem");
  return fs.readFileSync(pathToKey, { encoding: "utf8" });
};

const getPrivKeyAsync = async () => {
  const pathToKey = path.join(process.cwd(), ".private", ".id_rsa_priv.pem");
  return await fsPromises.readFile(pathToKey, { encoding: "utf8" });
};

const getPubKey = () => {
  const pathToKey = path.join(process.cwd(), ".private", ".id_rsa_pub.pem");
  return fs.readFileSync(pathToKey, { encoding: "utf8" });
};

const getPubKeyAsync = async () => {
  const pathToKey = path.join(process.cwd(), ".private", ".id_rsa_pub.pem");
  return await fsPromises.readFile(pathToKey, { encoding: "utf8" });
};

const keysExist = () => {
  const pubKeyPath = path.join(process.cwd(), ".private", ".id_rsa_pub.pem");
  const privKeyPath = path.join(process.cwd(), ".private", ".id_rsa_priv.pem");
  return fs.existsSync(pubKeyPath) && fs.existsSync(privKeyPath);
};

const issueJWT = async (
  sub,
  { type = "ACCESS_TOKEN", maxAge = 3600 * 24, target } = {}
) => {
  const PRIV_KEY = await getPrivKeyAsync();

  const payload = {
    sub,
    iam: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + maxAge,
    type,
    target,
  };

  const signedToken = jsonwebtoken.sign(payload, PRIV_KEY, {
    algorithm: "RS256",
  });

  return signedToken;
};

const checkJWT = (token) => {
  try {
    const payload = jsonwebtoken.verify(token, getPubKey(), {
      algorithms: ["RS256"],
      ignoreExpiration: false,
      jsonWebTokenOptions: {
        maxAge: "1d",
      },
    });
    return payload;
  } catch {
    return null;
  }
};

const checkPassword = async (password, passwordHash, passwordSalt) => {
  const hash = crypto
    .scryptSync(password ?? "", passwordSalt ?? "", 128)
    .toString("hex");
  return hash === passwordHash;
};

const hashPassword = async (password) => {
  const passwordSalt = crypto.randomBytes(32).toString("hex");
  const passwordHash = crypto
    .scryptSync(password, passwordSalt, 128)
    .toString("hex");
  return { passwordHash, passwordSalt };
};

const generateStrongPassword = async () => {
  const password = generatePassword({
    length: 24,
    numbers: true,
    symbols: true,
    lowercase: true,
    uppercase: true,
    strict: true,
  });
  const { passwordHash, passwordSalt } = await hashPassword(password);
  return { password, passwordHash, passwordSalt };
};

module.exports = {
  generateKeypair,
  getPrivKey,
  getPrivKeyAsync,
  getPubKey,
  getPubKeyAsync,
  issueJWT,
  checkJWT,
  checkPassword,
  hashPassword,
  generateStrongPassword,
  keysExist,
};
