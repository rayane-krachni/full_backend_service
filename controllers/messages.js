const { io } = require("../config/io");
const service = require("../services/messages");
const fs = require('fs');
const path = require('path');

const get = async (req, res, next) => {
  try {
    const result = await service.find();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// const getByPatient = async (req, res, next) => {
//   try {
//     const user = req.user._id;
//     const coach = req.user.coach;
//     if (!coach) {
//       res.sendStatus(404);
//       return;
//     }
//     const result = await service.find({ user, coach: coach._id });
//     res.json({ coach, messages: result });
//   } catch (error) {
//     next(error);
//   }
// };

const getByPatient = async (req, res, next) => {
  try {
    const patientId = req.user._id;

    // Get all doctors with their last message time
    const doctors = await service.getDoctorsWithMessages(patientId);

    if (!doctors || doctors.length === 0) {
      return res.status(200).json({
        message: "No conversations found",
        doctors: [],
      });
    }

    // Get last message content for each doctor
    const conversations = await Promise.all(
      doctors.map(async (doctor) => {
        const lastMessage = await service.getLastMessage({
          patient: patientId,
          doctor: doctor._id,
        });

        return {
          doctor: {
            _id: doctor._id,
            name: doctor.name,
            image: doctor.image || "/default-avatar.png",
            specialty: doctor.specialty,
          },
          lastMessage: lastMessage
            ? {
                text: lastMessage.text,
                time: lastMessage.createdAt,
                isSeen: lastMessage.isSeen,
                sender: lastMessage.source,
              }
            : null,
        };
      })
    );

    return res.status(200).json({ doctors: conversations });
  } catch (error) {
    console.error("Error in getByPatient:", error);
    next(error);
  }
};

// In your messages service file

const getByDoctor = async (req, res, next) => {
  try {
    let doctorId = req.user._id;
    if (req.user.role === "EMPLOYEE") doctorId = req.user.associatedDoctor;

    // 1. Get all patients who have messaged with this doctor
    const patients = await service.getPatientsWithMessages(doctorId);

    if (!patients || patients.length === 0) {
      return res.status(200).json({
        message: "No conversation history found",
        patients: [],
      });
    }

    // 2. Get last message for each patient
    const conversations = await Promise.all(
      patients.map(async (patient) => {
        const lastMessage = await service.getLastMessage({
          doctor: doctorId,
          patient: patient._id,
        });

        return {
          patient: {
            _id: patient._id,
            name: patient.name,
            image: patient.image || "/default-avatar.png",
            age: patient.age,
            gender: patient.gender,
          },
          lastMessage: lastMessage
            ? {
                text: lastMessage.text,
                time: lastMessage.createdAt,
                isSeen: lastMessage.isSeen,
                sender: lastMessage.source, // 'PATIENT' or 'DOCTOR'
              }
            : null,
          unreadCount: await service.getUnreadCount({
            doctor: doctorId,
            patient: patient._id,
          }),
        };
      })
    );

    // 3. Sort by most recent message
    conversations.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.time) - new Date(a.lastMessage.time);
    });

    return res.status(200).json({ patients: conversations });
  } catch (error) {
    console.error("Error in getByDoctor:", error);
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const result = await service.findById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const sendToPatient = async (req, res, next) => {
  try {
    let doctor = req.user._id;
    if (req.user.role === "EMPLOYEE") doctor = req.user.associatedDoctor;

    const patient = req.params.id;
    const messageData = {
      ...req.body,
      source: "DOCTOR",
      doctor,
      patient,
    };
    // console.log(messageData)
    // Handle file attachments if present
    if (req.files && req.files.length > 0) {
      messageData.attachments = await Promise.all(
        req.files.map(async (file) => {
          // Move file from temp to permanent location
          const permanentDir = 'uploads/message_attachments';
          const permanentPath = path.join(permanentDir, file.filename);
          
          // Ensure directory exists
          if (!fs.existsSync(permanentDir)) {
            fs.mkdirSync(permanentDir, { recursive: true });
          }
          
          // Move file from temp to permanent location
          fs.renameSync(file.path, permanentPath);
          
          return {
            type: file.mimetype.startsWith("image/") ? "image" : "pdf",
            url: `/${permanentPath.replace(/\\/g, '/')}`,
            filename: file.originalname,
            size: file.size,
          };
        })
      );
    }
    // console.log(messageData)
    const result = await service.create(messageData);
    try {
      // console.log("Send to patient --------------")
      // console.log(patient, result)
      // console.log(doctor, result)
      Object.values(
        io.activePatientConnections[patient]?.sockets ?? []
      ).forEach((socket) => socket.emit("new-message", result));
      Object.values(io.activeDoctorConnections[doctor]?.sockets ?? []).forEach(
        (socket) => socket.emit("new-message", result)
      );
    } catch (socketError) {
      console.error("Socket error:", socketError);
    }

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const sendToDoctor = async (req, res, next) => {
  try {
    const patientId = req.user._id.toString();
    const doctorId = req.params.id.toString();

    if (!doctorId) {
      return res.sendStatus(404);
    }

    const messageData = {
      ...req.body,
      source: "PATIENT",
      doctor: doctorId,
      patient: patientId,
    };

    // Handle file attachments if present
    if (req.files && req.files.length > 0) {
      messageData.attachments = await Promise.all(
        req.files.map(async (file) => {
          // Move file from temp to permanent location
          const permanentDir = 'uploads/message_attachments';
          const permanentPath = path.join(permanentDir, file.filename);
          
          // Ensure directory exists
          if (!fs.existsSync(permanentDir)) {
            fs.mkdirSync(permanentDir, { recursive: true });
          }
          
          // Move file from temp to permanent location
          fs.renameSync(file.path, permanentPath);
          
          return {
            type: file.mimetype.startsWith("image/") ? "image" : "pdf",
            url: `/${permanentPath.replace(/\\/g, '/')}`,
            filename: file.originalname,
            size: file.size,
          };
        })
      );
    }

    const result = await service.create(messageData);

    // Debugging logs
    // console.log("Active user connections:", Object.keys(io.activePatientConnections));
    // console.log("Active doctor connections:", Object.keys(io.activeDoctorConnections));

    // Send to patient (if online)
    if (io.activePatientConnections[patientId]?.sockets) {
      Object.values(io.activePatientConnections[patientId].sockets).forEach(
        (socket) => socket.emit("new-message", result)
      );
    }

    // Send to doctor (if online)
    if (io.activeDoctorConnections[doctorId]?.sockets) {
      Object.values(io.activeDoctorConnections[doctorId].sockets).forEach(
        (socket) => socket.emit("new-message", result)
      );
    }

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const patchById = async (req, res, next) => {
  try {
    const result = await service.updateById(req.params.id, req.data);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const markSeen = async (req, res, next) => {
  try {
    let accountType = req.user.accountType;
    const user = accountType === "PATIENT" ? req.user._id : req.params.receiver;
    let doctorId = req.user._id;
    if (accountType === "EMPLOYEE") {
      accountType = "DOCTOR";
      doctorId = req.user.associatedDoctor;
    }
    const doctor = accountType === "DOCTOR" ? doctorId : req.params.receiver;
    if (!user || !doctor) {
      return res.status(400).json({ error: "Missing user/doctor ID" });
    }
    const source = accountType === "DOCTOR" ? "PATIENT" : "DOCTOR";
    const result = await service.markSeen({ source, user, doctor });
    res.sendStatus(200);
    try {
      Object.values(io.activePatientConnections[user]?.sockets ?? []).forEach(
        (socket) => {
          socket.emit("messages-seen", { doctor });
        }
      );
      Object.values(io.activeDoctorConnections[doctor]?.sockets ?? []).forEach(
        (socket) => {
          socket.emit("messages-seen", { user });
        }
      );
    } catch (error) {
      console.log(error);
    }
  } catch (error) {
    next(error);
  }
};

const deleteById = async (req, res, next) => {
  try {
    const result = await service.deleteById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getConversation = async (req, res, next) => {
  try {
    const { mongoose } = require("mongoose");
    const currentUser = req.user._id;
    const currentUserType = req.user.accountType;
    const otherUserId = req.params.id;

    if (!otherUserId) {
      return res.status(400).json({ error: "Missing participant ID" });
    }

    // Convert all IDs to ObjectId
    const toObjectId = (id) => new mongoose.Types.ObjectId(id);
    const currentUserId = toObjectId(currentUser);
    const otherUserIdObj = toObjectId(otherUserId);

    // Determine query based on account type
    let query;
    if (currentUserType === "PATIENT") {
      query = {
        patient: currentUserId,
        doctor: otherUserIdObj,
        isDeleted: false,
      };
    } else if (currentUserType === "DOCTOR") {
      query = {
        doctor: currentUserId,
        patient: otherUserIdObj,
        isDeleted: false,
      };
    } else {
      return res.status(400).json({ error: "Invalid account type" });
    }

    // Include reverse conversation if needed (both sides)
    const fullQuery = {
      $or: [
        query,
        {
          doctor: query.patient,
          patient: query.doctor,
          isDeleted: false,
        },
      ],
    };

    // Get messages using Model directly (bypass service layer)
    const Message = mongoose.model("Message");
    const messages = await Message.find(fullQuery)
      .sort({ createdAt: 1 }) // Oldest first
      .lean();

    // Enhance with isMe flag
    const enhancedMessages = messages.map((msg) => ({
      ...msg,
      isMe: msg.source === currentUserType,
    }));

    // Mark unread messages
    const unreadMessages = enhancedMessages.filter(
      (msg) => !msg.isSeen && !msg.isMe
    );
    if (unreadMessages.length > 0) {
      await service.markMultipleSeen(unreadMessages.map((msg) => msg._id));

      // Notify the other user that messages have been seen
      const recipientId =
        currentUserType === "PATIENT" ? otherUserId : currentUser;

      const senderId =
        currentUserType === "PATIENT" ? currentUser : otherUserId;

      const connectionType =
        currentUserType === "PATIENT"
          ? "activeDoctorConnections"
          : "activePatientConnections";

      const recipientSockets = io[connectionType][recipientId]?.sockets;

      if (recipientSockets) {
        Object.values(recipientSockets).forEach((socket) => {
          socket.emit("messages-seen", {
            [currentUserType.toLowerCase()]: senderId,
          });
        });
      }
    }

    return res.status(200).json({ messages: enhancedMessages });
  } catch (error) {
    console.error("Error in getConversation:", error);
    next(error);
  }
};

module.exports = {
  get,
  getById,
  getByDoctor,
  getByPatient,
  sendToDoctor,
  sendToPatient,
  patchById,
  markSeen,
  deleteById,
  getConversation,
};
