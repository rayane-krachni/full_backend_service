const userServices = require("../services/user");
const adminServices = require("../services/admin");
const { checkJWT } = require("../utils/crypto");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const sharp = require("sharp");

const io = {
  activeAdminConnections: {},
  activePatientConnections: {},
  activeDoctorConnections: {},
};

// Configure local storage directory
const UPLOADS_DIR = path.join(__dirname, "../uploads");
const MESSAGE_ATTACHMENTS_DIR = path.join(UPLOADS_DIR, "message_attachments");

// Ensure directories exist
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(MESSAGE_ATTACHMENTS_DIR))
  fs.mkdirSync(MESSAGE_ATTACHMENTS_DIR);

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, MESSAGE_ATTACHMENTS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only images and PDFs are allowed."),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Add these to your io object
io.upload = upload;
io.MESSAGE_ATTACHMENTS_DIR = MESSAGE_ATTACHMENTS_DIR;

const setSocketServer = (server) => {
  io.instance = server;

  // Initialize connection maps if they don't exist
  io.activeAdminConnections = io.activeAdminConnections || {};
  io.activePatientConnections = io.activePatientConnections || {};
  io.activeDoctorConnections = io.activeDoctorConnections || {};

  server.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token ?? socket.handshake.query.token;
      if (!token) {
        return next(new Error("Authentication token missing"));
      }

      const payload = checkJWT(token);
      if (!payload || payload.type !== "ACCESS_TOKEN") {
        return next(new Error("Invalid token"));
      }

      let account = null;
      switch (payload.target) {
        case "PATIENT":
          account = await userServices.findById(payload.sub);
          if (account) account.accountType = "PATIENT"; // Standardize patient as PATIENT type
          break;
        case "DOCTOR":
          account = await userServices.findById(payload.sub);
          if (account) account.accountType = "DOCTOR";
          break;
        case "NURSE":
          account = await userServices.findById(payload.sub);
          if (account) account.accountType = "DOCTOR";
          break;
        case "EMPLOYEE":
          account = await userServices.findById(payload.sub);
          if (account) account.accountType = "DOCTOR";
          break;
        case "ADMIN":
          account = await adminServices.findById(payload.sub);
          break;
        default:
          return next(new Error("Invalid account type"));
      }

      if (!account) {
        return next(new Error("Account not found"));
      }
      // Ensure ID is stored as string for consistent lookups
      socket.request.user = {
        ...account,
        id: account.associatedDoctor
          ? account.associatedDoctor.toString()
          : account.associatedDoctor,
        accountType: payload.target,
      };

      next();
    } catch (error) {
      console.error("Socket auth error:", error);
      next(new Error("Authentication failed"));
    }
  });

  server.on("connection", (socket) => {
    const account = socket.request.user;
    if (!account) {
      return socket.disconnect(true);
    }

    // Convert ID to string for consistent lookups
    const accountId = account._id.toString();
    const accountType = account.accountType;

    // console.log(
    //   `New ${accountType} connection: ${accountId} (socket: ${socket.id})`
    // );

    const activeConnections =
      accountType === "ADMIN"
        ? io.activeAdminConnections
        : accountType === "DOCTOR" ||
          accountType === "NURSE" ||
          accountType === "EMPLOYEE"
        ? io.activeDoctorConnections
        : io.activePatientConnections; // PATIENTs are stored as PATIENTs

    // Initialize connection entry if it doesn't exist
    if (!activeConnections[accountId]) {
      activeConnections[accountId] = {
        id: accountId,
        accountType,
        sockets: {},
      };
    }

    // Store the socket connection
    activeConnections[accountId].sockets[socket.id] = socket;

    // Log current connection state
    // console.log(`Current connections:
    //   Users: ${Object.keys(io.activePatientConnections).length}
    //   Doctors: ${Object.keys(io.activeDoctorConnections).length}
    //   Admins: ${Object.keys(io.activeAdminConnections).length}`);

    // Message handler
    // socket.on("send-message", (data) => {
    //   const recipientConnections =
    //     data.receiverType === "DOCTOR"
    //       ? io.activeDoctorConnections[data.receiverId]
    //       : data.receiverType === "ADMIN"
    //       ? io.activeAdminConnections[data.receiverId]
    //       : io.activePatientConnections[data.receiverId];

    //   if (recipientConnections) {
    //     Object.values(recipientConnections.sockets).forEach(
    //       (recipientSocket) => {
    //         recipientSocket.emit("new-message", {
    //           senderId: accountId,
    //           senderType: accountType,
    //           text: data.text,
    //           timestamp: new Date().toISOString(),
    //         });
    //       }
    //     );
    //   } else {
    //     console.log(
    //       `Recipient ${data.receiverId} (${data.receiverType}) is offline`
    //     );
    //     // Store message for later delivery
    //   }
    // });

    // Message handler - updated for file attachments
    socket.on("send-message", async (data) => {
      try {
        const messageData = {
          text: data.text,
          senderId: accountId,
          senderType: accountType,
          receiverId: data.receiverId,
          receiverType: data.receiverType,
          timestamp: new Date().toISOString(),
        };

        // Handle file attachments if present
        if (data.attachments && data.attachments.length > 0) {
          messageData.attachments = await Promise.all(
            data.attachments.map(async (fileData) => {
              // In a real implementation, you'd process the file upload here
              // For now, we'll assume the file was already uploaded via HTTP
              // and we're just receiving the file metadata

              const isImage = fileData.mimetype.startsWith("image/");
              let thumbnailUrl = null;

              if (isImage) {
                // Generate thumbnail for images
                const thumbnailPath = path.join(
                  MESSAGE_ATTACHMENTS_DIR,
                  `thumb_${fileData.filename}`
                );
                await sharp(fileData.path)
                  .resize(200, 200)
                  .toFile(thumbnailPath);
                thumbnailUrl = `/uploads/message_attachments/thumb_${fileData.filename}`;
              }

              return {
                type: isImage ? "image" : "pdf",
                url: `/uploads/message_attachments/${fileData.filename}`,
                filename: fileData.originalname,
                size: fileData.size,
                thumbnail: thumbnailUrl,
              };
            })
          );
        }

        // Save to database (you'll need to implement this in your service)
        const savedMessage = await messageService.create(messageData);

        // Emit to recipient
        const recipientConnections =
          data.receiverType === "DOCTOR"
            ? io.activeDoctorConnections[data.receiverId]
            : data.receiverType === "ADMIN"
            ? io.activeAdminConnections[data.receiverId]
            : io.activePatientConnections[data.receiverId];

        if (recipientConnections) {
          Object.values(recipientConnections.sockets).forEach((socket) => {
            socket.emit("new-message", savedMessage);
          });
        }

        // Also emit to sender for sync
        socket.emit("message-sent", savedMessage);
      } catch (error) {
        console.error("Error handling message:", error);
        socket.emit("message-error", { error: "Failed to send message" });
      }
    });

    // Disconnect handler
    socket.on("disconnect", () => {
      // console.log(
      //   `${accountType} ${accountId} disconnected (socket: ${socket.id})`
      // );

      const userEntry = activeConnections[accountId];
      if (userEntry) {
        delete userEntry.sockets[socket.id];
        if (Object.keys(userEntry.sockets).length === 0) {
          delete activeConnections[accountId];
        }
      }

      // console.log(`Remaining connections:
      //   Users: ${Object.keys(io.activePatientConnections).length}
      //   Doctors: ${Object.keys(io.activeDoctorConnections).length}
      //   Admins: ${Object.keys(io.activeAdminConnections).length}`);
    });
  });
};

module.exports = { setSocketServer, io };
