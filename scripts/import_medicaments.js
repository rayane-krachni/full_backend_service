const mammoth = require("mammoth");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Medicament = require("../models/medicaments");

// Handle pdf-parse import compatibility
let pdf = require("pdf-parse");
if (typeof pdf !== 'function' && pdf.default) {
  pdf = pdf.default;
}

// Explicitly load .env from parent directory
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const connectDB = async () => {
  try {
    if (!process.env.DB_URL) {
      throw new Error("DB_URL is not defined in .env file");
    }
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

const importMedicaments = async () => {
  await connectDB();

  const docxPath = "G:\\work_projects\\Sahti_Resources\\Resources\\Liste des médicaments.docx";
  const pdfPath = "G:\\work_projects\\Sahti_Resources\\Resources\\Liste des médicaments.pdf";

  try {
    let text = "";
    
    if (fs.existsSync(docxPath)) {
      console.log(`Reading DOCX file from: ${docxPath}`);
      const result = await mammoth.extractRawText({ path: docxPath });
      text = result.value;
    } else if (fs.existsSync(pdfPath)) {
      console.log(`DOCX not found. Reading PDF file from: ${pdfPath}`);
      const dataBuffer = fs.readFileSync(pdfPath);
      const data = await pdf(dataBuffer);
      text = data.text;
    } else {
      throw new Error("Neither DOCX nor PDF file found.");
    }

    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log(`Found ${lines.length} lines. Processing...`);

    let count = 0;
    for (const line of lines) {
      // Skip short lines or headers/footers if possible
      if (line.length < 3) continue;

      // Check if exists
      const exists = await Medicament.findOne({ name: line });
      if (!exists) {
        await Medicament.create({ name: line });
        count++;
        if (count % 100 === 0) console.log(`Imported ${count} medicaments...`);
      }
    }

    console.log(`Successfully imported ${count} new medicaments.`);
  } catch (error) {
    console.error("Error importing medicaments:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

importMedicaments();
