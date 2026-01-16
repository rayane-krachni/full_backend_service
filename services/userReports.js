const UserReport = require("../models/userReports");

const create = async (data) => {
  const report = new UserReport(data);
  return await report.save();
};

const list = async (query = {}, options = {}) => {
  const { page = 1, limit = 10 } = options;
  return await UserReport.paginate(query, {
    page,
    limit,
    sort: { createdAt: -1 },
    populate: [
      { path: "reporter", select: "fullName email phone picture" },
      { path: "reported", select: "fullName email phone picture" },
    ],
  });
};

const getById = async (id) => {
  return await UserReport.findById(id)
    .populate("reporter", "fullName email phone picture")
    .populate("reported", "fullName email phone picture");
};

const updateStatus = async (id, status) => {
  return await UserReport.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );
};

module.exports = {
  create,
  list,
  getById,
  updateStatus,
};
