const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const RadiologicalExploration = require("../models/radiologicalExplorations");
const ParamedicalAct = require("../models/paramedicalActs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.DB_URL || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sahti";

// PDF Paths
const EXPLORATIONS_PDF = path.join(__dirname, "../../Docs/Les exploration radiologique et électronique et Anapath.pdf");
const ACTS_PDF = path.join(__dirname, "../../Docs/Les actes paramédicaux.pdf");

async function connect() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");
}

async function parseAndSeedExplorations() {
  try {
    if (!fs.existsSync(EXPLORATIONS_PDF)) {
      console.log(`File not found: ${EXPLORATIONS_PDF}`);
      return;
    }

    const dataBuffer = fs.readFileSync(EXPLORATIONS_PDF);
    const data = await pdf(dataBuffer);
    
    // Simple text splitting by new line, filtering empty or short lines
    const lines = data.text.split("\n").map(l => l.trim()).filter(l => l.length > 3);
    
    let count = 0;
    for (const line of lines) {
       // Avoid headers or page numbers if possible (rudimentary filtering)
       if (/page|chapitre/i.test(line)) continue;

       // Check if exists
       const exists = await RadiologicalExploration.findOne({ name: line });
       if (!exists) {
         await RadiologicalExploration.create({ name: line, category: "General" });
         count++;
       }
    }
    console.log(`Seeded ${count} Radiological Explorations`);

  } catch (error) {
    console.error("Error seeding explorations:", error);
  }
}

async function parseAndSeedActs() {
  try {
    if (!fs.existsSync(ACTS_PDF)) {
      console.log(`File not found: ${ACTS_PDF}`);
      return;
    }

    const dataBuffer = fs.readFileSync(ACTS_PDF);
    const data = await pdf(dataBuffer);
    
    const lines = data.text.split("\n").map(l => l.trim()).filter(l => l.length > 3);
    
    let count = 0;
    for (const line of lines) {
       if (/page|chapitre/i.test(line)) continue;
       
       const exists = await ParamedicalAct.findOne({ name: line });
       if (!exists) {
         await ParamedicalAct.create({ name: line, category: "General" });
         count++;
       }
    }
    console.log(`Seeded ${count} Paramedical Acts`);

  } catch (error) {
    console.error("Error seeding acts:", error);
  }
}

async function run() {
  await connect();
  await parseAndSeedExplorations();
  await parseAndSeedActs();
  await mongoose.disconnect();
  console.log("Done");
  process.exit(0);
}

run();
