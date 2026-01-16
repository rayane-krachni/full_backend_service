const { generateKeypair } = require("../utils/crypto");
const path = require("node:path");
const fs = require("node:fs");

const privatePath = path.join(process.cwd(), ".private");
fs.mkdirSync(privatePath, { recursive: true });

generateKeypair();
