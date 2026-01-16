const { Patient } = require("../models/user");
const { Favorite } = require("../models/favorite");
const { popRandom } = require("../utils/general");
const fs = require("fs");
const { RecordNotFoundError, DataValidationError } = require("../exceptions");

const find = async (filter, userType) => {
  try {
    const patientId = userType._id;
    const patient = await Patient.findById(patientId).populate({
      path: "favoriteDoctors.doctorId",
      match: { isDeleted: false },
      select:
        "fullName picture role specialities businessInfo.practiceType businessInfo.consultationFee",
    });

    // Filter out null doctors (in case they were deleted)
    const favorites = patient.favoriteDoctors.filter((fav) => fav.doctorId);

    return favorites;
  } catch (error) {
    next(error);
  }
};

const create = async (data, user) => {
  const patientId = user._id;
  const { doctorId, notes } = data;

  // Check if already favorited
  const existingFavorite = await Patient.findOne({
    _id: patientId,
    "favoriteDoctors.doctorId": doctorId,
  });

  if (existingFavorite) {
    return { success: false, message: "Doctor is already in favorites" };
  }

  const result = await Patient.findByIdAndUpdate(
    patientId,
    {
      $push: {
        favoriteDoctors: {
          doctorId,
          notes,
        },
      },
    },
    { new: true }
  ).populate("favoriteDoctors.doctorId", "fullName picture role");

  const addedFavorite = result.favoriteDoctors.find(
    (fav) => fav.doctorId._id.toString() === doctorId
  );

  return { success: true, data: addedFavorite };
};

const updateById = async (req, res, next) => {
  try {
    const patientId = req.user._id;
    const { favoriteId } = req.params;
    const { notes, isFavorite } = req.body;

    const update = {};
    if (notes !== undefined) update["favoriteDoctors.$.notes"] = notes;
    if (isFavorite !== undefined)
      update["favoriteDoctors.$.isFavorite"] = isFavorite;

    const result = await Patient.findOneAndUpdate(
      {
        _id: patientId,
        "favoriteDoctors._id": favoriteId,
      },
      { $set: update },
      { new: true }
    ).populate("favoriteDoctors.doctorId", "fullName picture role");

    if (!result) {
      return res.status(404).json({ message: "Favorite not found" });
    }

    const updatedFavorite = result.favoriteDoctors.find(
      (fav) => fav._id.toString() === favoriteId
    );

    res.json(updatedFavorite);
  } catch (error) {
    next(error);
  }
};

const deleteById = async (id, user) => {
  try {
    const patientId = user._id;
    const { favoriteId } = id;

    const result = await Patient.findByIdAndUpdate(
      patientId,
      {
        $pull: {
          favoriteDoctors: { _id: favoriteId },
        },
      },
      { new: true }
    );

    if (!result) {
      return { message: "Favorite not found" };
    }

    return { message: "Favorite removed successfully" };
  } catch (error) {
    next(error);
  }
};
const findById = async (doctorId, patientId) => {
  const patient = await Patient.findOne(
    {
      _id: patientId,
      "favoriteDoctors.doctorId": doctorId
    },
    {
      "favoriteDoctors.$": 1
    }
  ).populate("favoriteDoctors.doctorId", "fullName picture role specialities");

  if (!patient || !patient.favoriteDoctors || patient.favoriteDoctors.length === 0) {
    return null;
  }

  return patient.favoriteDoctors[0];
};
module.exports = {
  findById,
  find,
  create,
  updateById,
  deleteById,
};
