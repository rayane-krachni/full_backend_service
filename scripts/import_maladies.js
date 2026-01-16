const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Maladie = require("../models/maladies");

// Handle pdf-parse import compatibility
const pdf = require("pdf-parse");

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

const importMaladies = async () => {
  await connectDB();

  const pdfPath = "G:\\work_projects\\Sahti_Resources\\Resources\\Liste des maladies.pdf";

  try {
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found at: ${pdfPath}`);
    }

    console.log(`Reading PDF file from: ${pdfPath}`);
    const dataBuffer = fs.readFileSync(pdfPath);
    
    const data = await pdf(dataBuffer);
    const text = data.text;

    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log(`Found ${lines.length} lines. Processing...`);

    let count = 0;
    for (const line of lines) {
      // Skip short lines or headers/footers if possible
      if (line.length < 3) continue;

      // Check if exists
      const exists = await Maladie.findOne({ name: line });
      if (!exists) {
        await Maladie.create({ name: line });
        count++;
        if (count % 100 === 0) console.log(`Imported ${count} maladies...`);
      }
    }

    console.log(`Successfully imported ${count} new maladies.`);
  } catch (error) {
    console.error("Error importing maladies:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

importMaladies();
