const { issueJWT } = require("../utils/crypto");
const Model = require("../models/user");
const Organization = require("../models/organizations");

const loginAdmin = async (req, res) => {
  // console.log('hi')
  const accountInfo = req.user;
  if (!accountInfo.isActive) {
    res.sendStatus(403);
    return;
  }
  delete accountInfo.isActive;
  const accessToken = await issueJWT(accountInfo._id, { target: "ADMIN" });
  res.status(200).json({
    accessToken,
    userData: accountInfo,
    accountType: "ADMIN",
  });
};

const loginUser = async (req, res) => {
  try {
    
    let { firebaseToken } = req.body;
    if (!firebaseToken) {
      firebaseToken = null;
    }
    const accountInfo = { ...req.user };
    console.log(firebaseToken, accountInfo._id, req.body)
    // console.log(accountInfo)
    if (!accountInfo.isActive) {
      return res.status(200).json({
        id: accountInfo.id,
        auth: false,
      });
    }
    accountInfo.accountType = accountInfo.role;
    
    // Check organization status for doctors
    if (accountInfo.role === "DOCTOR") {
      const organization = await Organization.findOne({
        $or: [
          { adminDoctor: accountInfo._id },
          { members: accountInfo._id }
        ],
        isDeleted: false
      });
      
      if (organization) {
        accountInfo.isDirector = organization.adminDoctor.toString() === accountInfo._id.toString();
        accountInfo.organisationId = organization._id;
      } else {
        accountInfo.isDirector = false;
        accountInfo.organisationId = null;
      }
    }
    await Model.User.findByIdAndUpdate(accountInfo._id, { firebaseToken });

    const accessToken = await issueJWT(accountInfo._id, {
      target: accountInfo.accountType,
    });

    return res.status(200).json({
      accessToken,
      userData: accountInfo,
      accountType: accountInfo.role,
      firebaseToken, // Optionally send it back to the client
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const loginGuest = async (req, res) => {
  const accountInfo = req.user;

  if (!accountInfo.isActive) {
    return res.sendStatus(403);
  }

  const accessToken = await issueJWT(accountInfo._id, { target: "GUEST" });

  res.status(200).json({
    accessToken,
    userData: accountInfo,
    accountType: "GUEST",
  });
};

const checkAccessToken = async (req, res) => {
  const accountInfo = req.user;
  if (!accountInfo.isActive) {
    res.sendStatus(403);
    return;
  }
  delete accountInfo.isActive;
  const target = req.jwtPayload.target;
  const accessToken = await issueJWT(accountInfo._id, target);
  res.status(200).json({
    accessToken,
    userData: accountInfo,
    accountType: target,
  });
};

module.exports = {
  loginAdmin,
  loginUser,
  loginGuest,
  checkAccessToken,
};
