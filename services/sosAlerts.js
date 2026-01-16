const SOSAlert = require("../models/sosAlerts");

const create = async (data) => {
  const alert = new SOSAlert(data);
  return await alert.save();
};

const list = async (query = {}, options = {}) => {
  const { page = 1, limit = 10 } = options;
  return await SOSAlert.paginate(query, {
    page,
    limit,
    sort: { createdAt: -1 },
    populate: [
        { path: "sender", select: "fullName email phone picture" },
        { path: "organization", select: "name" }
    ],
  });
};

module.exports = {
  create,
  list,
};
