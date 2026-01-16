const service = require("../services/doctors");
const sosServices = require("../services/sosAlerts");
const notificationServices = require("../services/notifications");
const organizationServices = require("../services/organizations");
const { io } = require("../config/io");

const sendSOS = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { location } = req.body;

    // 1. Get sender's details & Organization
    const sender = await service.findById(senderId);
    
    // Find organization where user is a member
    const organization = await organizationServices.find({ filter: { members: senderId } });
    const userOrg = organization && organization[0] ? organization[0] : null;

    if (!userOrg) {
        return res.status(404).json({ error: "Organization not found for this user" });
    }

    // 2. Create SOS Alert
    const sosData = {
      sender: senderId,
      organization: userOrg._id,
      location,
      status: "ACTIVE"
    };
    const sosAlert = await sosServices.create(sosData);

    // 3. Notify Organization Admin (The "adminDoctor")
    if (userOrg.adminDoctor) {
        const adminId = userOrg.adminDoctor.toString();
        
        // Socket.io
        if (io.activeDoctorConnections[adminId]) {
             Object.values(io.activeDoctorConnections[adminId].sockets).forEach(socket => {
                 socket.emit("sos-alert", {
                     alert: sosAlert,
                     sender: { fullName: sender.fullName, picture: sender.picture },
                     message: "SOS Alert Received!"
                 });
             });
        }

        // Notification
        await notificationServices.createAndSend({
             userId: userOrg.adminDoctor,
             docId: sosAlert._id,
             docType: "SOS_ALERT",
             action: "SOS_ALERT"
        });
    }

    // 4. Notify Super Admins
    Object.keys(io.activeAdminConnections).forEach(adminId => {
        Object.values(io.activeAdminConnections[adminId].sockets).forEach(socket => {
             socket.emit("sos-alert", {
                 alert: sosAlert,
                 sender: { fullName: sender.fullName, picture: sender.picture },
                 organization: { name: userOrg.name },
                 message: "SOS Alert Received!"
             });
        });
    });

    res.status(201).json(sosAlert);
  } catch (error) {
    console.error("SOS Error:", error);
    res.status(500).json({ error: error.message });
  }
};

const getSOSAlerts = async (req, res) => {
    try {
        const userId = req.user._id;
        // Find org where user is admin
        const organization = await organizationServices.find({ filter: { adminDoctor: userId } });
        const userOrg = organization && organization[0] ? organization[0] : null;
        
        if (!userOrg) {
             return res.json([]); 
        }

        const alerts = await sosServices.list({ organization: userOrg._id }, req.query);
        res.json(alerts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const get = async (req, res, next) => {
  try {
    const rawFilter = req.query;
    const filter = {};
    
    for (const key in rawFilter) {
      if (key.startsWith('services[')) {
        const serviceKey = key.match(/\[(.*?)\]/)[1];
        if (!filter.services) filter.services = {};
        filter.services[serviceKey] = rawFilter[key];
      } else if (key === 'service') {
        // Handle single or multiple service IDs
        const serviceValue = rawFilter[key];
        if (Array.isArray(serviceValue)) {
          filter.service = { $in: serviceValue };
        } else if (typeof serviceValue === 'string' && serviceValue.includes(',')) {
          filter.service = { $in: serviceValue.split(',').map(id => id.trim()) };
        } else {
          filter.service = serviceValue;
        }
      } else {
        filter[key] = rawFilter[key];
      }
    }
    for (const key in rawFilter) {
      if (key.startsWith('availability[')) {
        const serviceKey = key.match(/\[(.*?)\]/)[1];
        if (!filter.availability) filter.availability = {};
        filter.availability[serviceKey] = rawFilter[key];
      } else {
        filter[key] = rawFilter[key];
      }
    }
    const result = await service.find({ filter }, req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getDoctorPatients = async (req, res, next) => {
  try {
    const filter = req.query;
    const result = await service.getDoctorPatients(req.user._id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const result = await service.findById(req.params.id, {
      returnPassword: false,
      returnData: false,
    }, req.user);

    res.json(result);
  } catch (error) {
    next(error);
  }
};


const approveDoc = async (req, res, next) => {
  try {
    const { documentType } = req.body;
    if (!documentType) {
      return res.status(400).json({ message: "Document type is required" });
    }

    const result = await service.approveDoc(
      req.params.id,
      documentType,
      req.user._id // Track who approved the document
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const rejectDoc = async (req, res, next) => {
  try {
    const { documentType, reason } = req.body;
    if (!documentType || !reason) {
      return res.status(400).json({ 
        message: "Document type and rejection reason are required" 
      });
    }

    const result = await service.rejectDoc(
      req.params.id,
      documentType,
      reason,
      req.user._id // Track who rejected the document
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  get,
  getById,
  getDoctorPatients,
  approveDoc,
  rejectDoc,
  sendSOS,
  getSOSAlerts
};
