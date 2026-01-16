const { default: mongoose } = require("mongoose");
const { ObjectId } = mongoose.Types;
const { RecordNotFoundError, DataValidationError } = require("../exceptions");
const Model = require("../models/messages");
const { parseValidatorError } = require("../utils/mongoose");
const notificationService = require("./notifications");

const findById = async (_id) => {
  const result = await Model.findById(_id)
    .populate([
      {
        path: "patient",
        select: "_id email firstName lastName picture",
        options: { lean: true },
      },
      {
        path: "doctor",
        select: "_id email firstName lastName picture",
        options: { lean: true },
      },
    ])
    .lean({ virtuals: true })
    .exec();
  if (!result || result.isDeleted) {
    throw new RecordNotFoundError(Model, "_id", _id);
  }
  delete result.isDeleted;
  return result;
};

const find = async ({ user, coach } = {}) => {
  const result = await Model.find(
    {
      isDeleted: false,
      ...(user ? { user } : {}),
    },
    { isDeleted: 0 }
  )
    .lean({ virtuals: true })
    .exec();
  return result;
};

const create = async (data) => {
  try {
    const result = new Model(data);
    await result.save();
    
    // Send notification for new message
    try {
      // Determine recipient based on message source
      const recipientId = data.source === "PATIENT" ? data.doctor : data.patient;
      
      await notificationService.createAndSend({
        userId: recipientId,
        docId: result._id,
        docType: "MESSAGE",
        action: "MESSAGE_RECEIVED",
        metadata: {
          senderId: data.source === "PATIENT" ? data.patient : data.doctor,
          senderType: data.source,
          hasAttachments: data.attachments && data.attachments.length > 0,
          messagePreview: data.text ? data.text.substring(0, 100) : "[Attachment]",
        },
      });
    } catch (notificationError) {
      console.error("Failed to send message notification:", notificationError);
      // Don't fail message creation if notification fails
    }
    
    return result.toObject({
      virtuals: true,
      transform: (doc, ret, options) => {
        delete ret.isDeleted;
        return ret;
      },
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      throw new DataValidationError(Model, parseValidatorError(error));
    } else {
      throw error;
    }
  }
};

const updateById = async (_id, data) => {
  try {
    const result = await Model.findOneAndUpdate(
      { _id, isDeleted: false },
      data,
      {
        new: true,
        runValidators: true,
        fields: { isDeleted: 0 },
      }
    ).lean({ virtuals: true });
    if (!result) {
      throw new RecordNotFoundError(Model, "_id", _id);
    }
    return result;
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      throw new DataValidationError(Model, parseValidatorError(error));
    } else {
      throw error;
    }
  }
};

const markSeen = async ({ source, user, doctor }) => {
    const result = await Model.updateMany(
      { source, user, doctor, isSeen: false },
      { isSeen: true }
    );
    if (result.modifiedCount === 0) {
      throw new RecordNotFoundError(Model, "user/doctor", `${user}/${doctor}`);
    }
    return result.nModified;
  };

const deleteById = async (_id) => {
  const result = await Model.findOneAndUpdate(
    { _id, isDeleted: false },
    { isDeleted: true },
    {
      new: true,
      runValidators: true,
      fields: { isDeleted: 0 },
    }
  ).lean({ virtuals: true });
  if (!result) {
    throw new RecordNotFoundError(Model, "_id", _id);
  }
  return result;
};
const getDoctorsWithMessages = async (patientId) => {
  return Model.aggregate([
    { 
      $match: { 
        patient: new ObjectId(patientId),
        isDeleted: false 
      } 
    },
    { 
      $group: { 
        _id: "$doctor",
        lastMessageTime: { $max: "$createdAt" }
      } 
    },
    { 
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "doctor"
      }
    },
    { $unwind: "$doctor" },
    { 
      $project: {
        _id: "$doctor._id",
        name: "$doctor.fullName",
        image: "$doctor.picture",
        specialty: "$doctor.specialty",
        lastMessageTime: 1
      }
    },
    { $sort: { lastMessageTime: -1 } }
  ]);
};

const getLastMessage = async ({ patient, doctor }) => {
  return Model.findOne(
    { 
      patient: new ObjectId(patient),
      doctor: new ObjectId(doctor),
      isDeleted: false
    },
    { 
      text: 1, 
      createdAt: 1, 
      isSeen: 1, 
      source: 1 
    }
  )
  .sort({ createdAt: -1 })
  .lean();
};

const getPatientsWithMessages = async (doctorId) => {
  return Model.aggregate([
    { 
      $match: { 
        doctor: new ObjectId(doctorId),
        isDeleted: false 
      } 
    },
    { 
      $group: { 
        _id: "$patient",
        lastMessageTime: { $max: "$createdAt" }
      } 
    },
    { 
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "patient"
      }
    },
    { $unwind: "$patient" },
    { 
      $project: {
        _id: "$patient._id",
        name: "$patient.fullName",
        image: "$patient.picture",
        age: "$patient.age",
        gender: "$patient.gender",
        lastMessageTime: 1
      }
    },
    { $sort: { lastMessageTime: -1 } }
  ]);
};

const getUnreadCount = async ({ doctor, patient }) => {
  return Model.countDocuments({
    doctor: new ObjectId(doctor),
    patient: new ObjectId(patient),
    source: 'PATIENT',
    isSeen: false,
    isDeleted: false
  });
};

const markMultipleSeen = async (messageIds) => {
  return Model.updateMany(
    { _id: { $in: messageIds } },
    { $set: { isSeen: true } }
  );
};
module.exports = {
  findById,
  find,
  create,
  updateById,
  markSeen,
  deleteById,
  getDoctorsWithMessages,
  getLastMessage,
  getPatientsWithMessages,
  getUnreadCount,
  markMultipleSeen
};
