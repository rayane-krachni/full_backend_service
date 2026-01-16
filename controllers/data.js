const fs = require("fs");
const country = require("../static/public/enums/countries.json");
const cities = require("../static/public/enums/cities.json");
const post_codes = require("../static/public/enums/post_codes.json");
const blood = require("../static/public/enums/blood.json");
const speciality = require("../static/public/enums/speciality.json");
const business = require("../static/public/enums/business.json");
const availability = require("../static/public/enums/availability.json");
const transaction = require("../static/public/enums/transaction.json");
const user = require("../static/public/enums/user.json");
const preConsultation = require("../static/public/enums/preConsultation.json");

const getBlood = async (req, res, next) => {
  try {
    res.status(200).json(blood.bloodTypes);
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while fetching charges.", error });
  }
};

const getSpeciality = async (req, res, next) => {
  try {
    res.status(200).json(speciality.specialities);
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while fetching charges.", error });
  }
};
const getCountries = async (req, res, next) => {
  try {
    res.status(200).json(country.country);
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while fetching charges.", error });
  }
};
const getStates = async (req, res) => {
  try {
    // Extract unique states (wilayas)
    const uniqueStates = [];
    const seenWilayas = new Set();

    for (const state of cities) {
      if (!seenWilayas.has(state.wilaya_code)) {
        seenWilayas.add(state.wilaya_code);
        uniqueStates.push({
          code: state.wilaya_code,
          name_ascii: state.wilaya_name_ascii,
          name: state.wilaya_name,
        });
      }
    }

    res.json({
      success: true,
      data: uniqueStates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch states",
      error: error.message,
    });
  }
};

const getCities = async (req, res) => {
  try {
    const wilayaCode = req.params.id; // The wilaya_code passed in the URL

    // Filter cities by wilaya_code
    const citiesInWilaya = post_codes
      .filter((city) => city.wilaya_code === wilayaCode)
      .map((city) => ({
        post_code: city.post_code,
        name_ascii: city.post_name_ascii,
        name: city.post_name,
        address_ascii: city.post_address_ascii,
        address: city.post_address,
        commune_id: city.commune_id,
      }));

    if (citiesInWilaya.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No cities found for the specified wilaya code",
      });
    }

    res.json({
      success: true,
      data: citiesInWilaya,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch cities",
      error: error.message,
    });
  }
};
const getBusinesses = async (req, res, next) => {
  try {
    res.status(200).json(business.businesses);
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while fetching charges.", error });
  }
};
const getAvailabilities = async (req, res, next) => {
  try {
    res.status(200).json(availability.availabilities);
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while fetching charges.", error });
  }
};
const getTransactions = async (req, res, next) => {
  try {
    res.status(200).json(transaction.transactions);
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while fetching charges.", error });
  }
};
const getFamily = async (req, res, next) => {
  try {
    res.status(200).json(user.familyMembers);
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while fetching charges.", error });
  }
};
const getAccount = async (req, res, next) => {
  try {
    res.status(200).json(user.type);
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while fetching charges.", error });
  }
};
const getPreConsultation = async (req, res, next) => {
  try {
    const userLanguage = req.user?.language || "fr";
    const labels = {
      bloodPressure: { en: "Blood Pressure", fr: "Tension artérielle", ar: "ضغط الدم" },
      weight: { en: "Weight", fr: "Poids", ar: "الوزن" },
      sugarLevel: { en: "Sugar Level", fr: "Glycémie", ar: "مستوى السكر" },
      height: { en: "Height", fr: "Taille", ar: "الطول" },
      temperature: { en: "Temperature", fr: "Température", ar: "درجة الحرارة" }
    };
    const localized = preConsultation.measurements.map((m) => ({
      ...m,
      label:
        labels[m.key]?.[userLanguage] ||
        labels[m.key]?.fr ||
        m.label
    }));
    res.status(200).json(localized);
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while fetching charges.", error });
  }
};
module.exports = {
  getBlood,
  getSpeciality,
  getBusinesses,
  getCountries,
  getTransactions,
  getAvailabilities,
  getFamily,
  getAccount,
  getStates,
  getStates,
  getCities,
  getPreConsultation,
};
