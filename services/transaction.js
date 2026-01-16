const Transaction = require("../models/transaction");
const Appointments = require("../models/appointments");
const { AppError } = require("../utils/errors");
const mongoose = require("mongoose");
const notificationService = require("./notifications");
const Balance = require("../models/balance");

/**
 * Get all transactions for a professional
 * @param {string} professionalId - The ID of the professional
 * @param {Object} options - Query options
 * @returns {Object} Transactions and summary
 */
const getTransactionHistory = async (professionalId, options = {}) => {
  const { status, type, startDate, endDate, page = 1, limit = 20 } = options;

  let query = { isDeleted: false };
  if (professionalId != null) query.doctor = professionalId;

  if (status) query.status = status;
  if (type) query.type = type;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Get total count for pagination
  const total = await Transaction.countDocuments(query);

  // Get transactions with pagination
  const transactions = await Transaction.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("patient", "fullName")
    .populate("doctor", "fullName")
    .populate({
      path: "appointment",
      model: Appointments,
      populate: {
        path: "service",
        select: "name",
      },
    })
    .lean();

  // Calculate summary
  const summary = await Transaction.aggregate([
    { $match: { ...query, status: "completed" } },
    {
      $group: {
        _id: "$type",
        totalAmount: { $sum: "$amount" },
        totalFee: { $sum: "$fee" },
        count: { $sum: 1 },
      },
    },
  ]);

  // Format summary by type
  const formattedSummary = summary.reduce((acc, item) => {
    acc[item._id] = {
      totalAmount: item.totalAmount,
      totalFee: item.totalFee,
      count: item.count,
    };
    return acc;
  }, {});

  // Add overall totals
  const overallTotals = summary.reduce(
    (acc, item) => {
      acc.totalAmount += item.totalAmount;
      acc.totalFee += item.totalFee;
      acc.count += item.count;
      return acc;
    },
    { totalAmount: 0, totalFee: 0, count: 0 }
  );

  // Calculate total amount and fee for completed transactions
  const completedTotal = await Transaction.aggregate([
    { $match: { ...query, status: "completed" } },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$amount" },
        totalFee: { $sum: "$fee" },
      },
    },
  ]);

  const totalCompleted =
    completedTotal.length > 0
      ? {
          totalAmount: completedTotal[0].totalAmount,
          totalFee: completedTotal[0].totalFee,
        }
      : { totalAmount: 0, totalFee: 0 };

  return {
    transactions,
    summary: {
      byType: formattedSummary,
      overall: overallTotals,
    },
    total: totalCompleted.totalAmount,
    fee: totalCompleted.totalFee,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get all withdrawal requests for admin approval
 * @param {Object} filter - Filter criteria
 * @returns {Object} Withdrawal requests with pagination
 */
const getWithdrawalRequests = async (filter = {}) => {
  const { page = 1, limit = 10, status = "requested" } = filter;
  const skip = (page - 1) * limit;

  const query = {
    type: "withdrawal",
    status,
    isDeleted: false,
  };

  // Get total count
  const total = await Transaction.countDocuments(query);

  // Get paginated withdrawal requests
  const withdrawalRequests = await Transaction.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate("doctor", "firstName lastName email phone");

  return {
    withdrawalRequests,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Request a payment withdrawal for a professional
 * @param {string} professionalId - The ID of the professional
 * @returns {Object} Withdrawal request result
 */
const requestWithdrawal = async (professionalId) => {
  // Check if there's already a pending withdrawal request
  const existingRequest = await Transaction.findOne({
    doctor: professionalId,
    type: "withdrawal",
    status: { $in: ["requested", "approved"] },
    isDeleted: false,
  });

  if (existingRequest) {
    return {
      success: false,
      message:
        "You already have a pending withdrawal request. Please wait until we process your previous request.",
      status: existingRequest.status,
    };
  }

  // Find all completed transactions that haven't been withdrawn
  const completedTransactions = await Transaction.find({
    doctor: professionalId,
    status: "completed",
    type: { $in: ["consultation", "home-care"] },
    isDeleted: false,
  });

  if (!completedTransactions.length) {
    // throw new AppError('No completed transactions available for withdrawal', 404);
    return {
      success: false,
      message: "No completed transactions available for withdrawal.",
      status: "Do not Exist",
    };
  }

  // Calculate total amount to withdraw
  const totalAmount = completedTransactions.reduce(
    (sum, tx) => sum + tx.amount,
    0
  );
  const totalFee = completedTransactions.reduce(
    (sum, tx) => sum + (tx.fee || 0),
    0
  );

  // Create withdrawal request transaction
  const withdrawalRequest = new Transaction({
    doctor: professionalId,
    amount: totalAmount,
    fee: totalFee,
    type: "withdrawal",
    status: "requested",
    metadata: {
      transactionIds: completedTransactions.map((tx) => tx._id),
      transactionCount: completedTransactions.length,
      requestDate: new Date(),
    },
  });

  await withdrawalRequest.save();

  return {
    success: true,
    withdrawalId: withdrawalRequest._id,
    totalAmount,
    totalFee,
    transactionCount: completedTransactions.length,
    requestDate: new Date(),
    status: "requested",
  };
};

/**
 * Approve a withdrawal request
 * @param {string} withdrawalId - The ID of the withdrawal request
 * @returns {Object} Approved withdrawal result
 */
const approveWithdrawal = async (withdrawalId) => {
  // Find the withdrawal request
  const withdrawalRequest = await Transaction.findOne({
    _id: withdrawalId,
    type: "withdrawal",
    status: "requested",
    isDeleted: false,
  });

  if (!withdrawalRequest) {
    throw new AppError("Withdrawal request not found", 404);
  }

  // Update the withdrawal request status to approved
  withdrawalRequest.status = "approved";
  withdrawalRequest.metadata.approvedDate = new Date();
  await withdrawalRequest.save();

  // Send notification for withdrawal approval
  try {
    await notificationService.createAndSend({
      userId: withdrawalRequest.doctor,
      docId: withdrawalRequest._id,
      docType: "WITHDRAWAL",
      action: "WITHDRAWAL_APPROVED",
      metadata: {
        amount: withdrawalRequest.amount,
        fee: withdrawalRequest.fee,
        approvedDate: new Date(),
      },
    });
  } catch (notificationError) {
    console.error(
      "Failed to send withdrawal approval notification:",
      notificationError
    );
  }

  // Process the actual withdrawal
  const result = await processWithdrawal(withdrawalRequest.doctor);

  return {
    ...result,
    requestId: withdrawalRequest._id,
    status: "approved",
  };
};

/**
 * Reject a withdrawal request
 * @param {string} withdrawalId - The ID of the withdrawal request
 * @param {string} reason - The reason for rejection
 * @returns {Object} Rejected withdrawal result
 */
const rejectWithdrawal = async (withdrawalId, reason) => {
  // Find the withdrawal request
  const withdrawalRequest = await Transaction.findOne({
    _id: withdrawalId,
    type: "withdrawal",
    status: "requested",
    isDeleted: false,
  });

  if (!withdrawalRequest) {
    throw new AppError("Withdrawal request not found", 404);
  }

  // Update the withdrawal request status to rejected
  withdrawalRequest.status = "rejected";
  withdrawalRequest.metadata.rejectedDate = new Date();
  withdrawalRequest.metadata.rejectionReason = reason || "No reason provided";
  await withdrawalRequest.save();

  return {
    withdrawalId: withdrawalRequest._id,
    totalAmount: withdrawalRequest.amount,
    totalFee: withdrawalRequest.fee,
    transactionCount: withdrawalRequest.metadata.transactionCount,
    requestDate: withdrawalRequest.metadata.requestDate,
    rejectedDate: new Date(),
    rejectionReason: reason || "No reason provided",
    status: "rejected",
  };
};

/**
 * Process payment withdrawal for a professional
 * @param {string} professionalId - The ID of the professional
 * @returns {Object} Withdrawal result
 */
const processWithdrawal = async (professionalId) => {
  // Find all completed transactions that haven't been withdrawn
  const completedTransactions = await Transaction.find({
    doctor: professionalId,
    status: "completed",
    type: { $in: ["consultation", "home-care"] },
    isDeleted: false,
  });

  if (!completedTransactions.length) {
    throw new AppError(
      "No completed transactions available for withdrawal",
      404
    );
  }

  // Calculate total amount to withdraw
  const totalAmount = completedTransactions.reduce(
    (sum, tx) => sum + tx.amount,
    0
  );
  const totalFee = completedTransactions.reduce(
    (sum, tx) => sum + (tx.fee || 0),
    0
  );

  // Create withdrawal transaction
  const withdrawal = new Transaction({
    doctor: professionalId,
    amount: totalAmount,
    fee: totalFee,
    type: "withdrawal",
    status: "completed",
    metadata: {
      transactionIds: completedTransactions.map((tx) => tx._id),
      transactionCount: completedTransactions.length,
      withdrawalDate: new Date(),
    },
  });

  await withdrawal.save();

  // Send notification for withdrawal processing
  try {
    await notificationService.createAndSend({
      userId: professionalId,
      docId: withdrawal._id,
      docType: "WITHDRAWAL",
      action: "WITHDRAWAL_PROCESSED",
      metadata: {
        amount: totalAmount,
        fee: totalFee,
        transactionCount: completedTransactions.length,
        withdrawalDate: new Date(),
      },
    });
  } catch (notificationError) {
    console.error(
      "Failed to send withdrawal processed notification:",
      notificationError
    );
  }

  // Update all related appointments
  const appointmentIds = completedTransactions
    .filter((tx) => tx.appointment)
    .map((tx) => tx.appointment);

  if (appointmentIds.length > 0) {
    await Appointments.updateMany(
      { _id: { $in: appointmentIds } },
      {
        "payment.status": "withdrawn",
        $push: {
          "payment.history": {
            amount: totalAmount,
            fee: totalFee,
            status: "withdrawn",
            date: new Date(),
            notes: "Payment withdrawn by professional",
          },
        },
      }
    );
  }

  return {
    withdrawalId: withdrawal._id,
    totalAmount,
    totalFee,
    transactionCount: completedTransactions.length,
    withdrawalDate: new Date(),
  };
};

/**
 * Get transaction details by ID
 * @param {string} transactionId - The ID of the transaction
 * @returns {Object} Transaction details
 */
const getTransactionDetails = async (transactionId) => {
  const transaction = await Transaction.findOne({
    _id: transactionId,
    isDeleted: false,
  });

  if (!transaction) {
    throw new AppError("Transaction not found", 404);
  }

  return transaction;
};

/**
 * Request a debt payment (Doctor uploads receipt)
 * @param {string} professionalId - The ID of the professional
 * @param {Object} paymentData - Payment details (amount, receipt, etc.)
 * @returns {Object} Payment request result
 */
const requestPayment = async (professionalId, paymentData) => {
  const payment = new Transaction({
    doctor: professionalId,
    amount: paymentData.amount, // Amount paid by doctor
    type: "payment",
    status: "requested",
    metadata: {
      receiptImage: paymentData.receiptImage, // URL or Path
      notes: paymentData.notes,
      requestDate: new Date(),
    },
  });

  await payment.save();

  // Notify Admin (Implementation dependent, usually via socket or just database entry)

  return {
    success: true,
    paymentId: payment._id,
    amount: payment.amount,
    status: "requested",
  };
};

/**
 * Approve a payment request (Admin confirms receipt)
 * @param {string} paymentId - The ID of the payment transaction
 * @returns {Object} Approved payment result
 */
const approvePayment = async (paymentId) => {
  const payment = await Transaction.findOne({
    _id: paymentId,
    type: "payment",
    status: "requested",
  });

  if (!payment) {
    throw new AppError("Payment request not found", 404);
  }

  // Update transaction status
  payment.status = "completed";
  payment.metadata.approvedDate = new Date();
  await payment.save();

  // Sync Balance: Decrement Doctor Debt
  // Amount is positive in transaction (amount paid), so we $inc a negative value to debt
  await Balance.findOneAndUpdate(
    { doctor: payment.doctor },
    {
      $inc: { currentDebt: -payment.amount },
      $set: { 
        lastUpdated: new Date(),
        lastPaymentDate: new Date()
      }
    },
    { upsert: true, new: true }
  );

  // Notify Doctor
  try {
    await notificationService.createAndSend({
      userId: payment.doctor,
      docId: payment._id,
      docType: "PAYMENT",
      action: "PAYMENT_APPROVED",
      metadata: {
        amount: payment.amount,
        approvedDate: new Date(),
      },
    });
  } catch (notificationError) {
    console.error("Failed to send payment approval notification:", notificationError);
  }

  return {
    success: true,
    paymentId: payment._id,
    status: "completed",
  };
};

/**
 * Reject a payment request
 * @param {string} paymentId - The ID of the payment transaction
 * @param {string} reason - Rejection reason
 */
const rejectPayment = async (paymentId, reason) => {
  const payment = await Transaction.findOne({
    _id: paymentId,
    type: "payment",
    status: "requested",
  });

  if (!payment) {
    throw new AppError("Payment request not found", 404);
  }

  payment.status = "rejected";
  payment.metadata.rejectedDate = new Date();
  payment.metadata.rejectionReason = reason;
  await payment.save();

  // Notify Doctor
   try {
    await notificationService.createAndSend({
      userId: payment.doctor,
      docId: payment._id,
      docType: "PAYMENT",
      action: "PAYMENT_REJECTED",
      metadata: {
        amount: payment.amount,
        reason: reason
      },
    });
  } catch (notificationError) {
    console.error("Failed to send payment rejection notification:", notificationError);
  }

  return {
    success: true,
    paymentId: payment._id,
    status: "rejected",
  };
};

/**
 * Get all payment requests for admin
 */
const getPaymentRequests = async (filter = {}) => {
  const { page = 1, limit = 10, status = "requested" } = filter;
  const skip = (page - 1) * limit;

  const query = {
    type: "payment",
    status,
    isDeleted: false,
  };

  const total = await Transaction.countDocuments(query);
  const paymentRequests = await Transaction.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate("doctor", "fullName email phone picture");

  return {
    paymentRequests,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  getTransactionHistory,
  requestWithdrawal,
  approveWithdrawal,
  rejectWithdrawal,
  processWithdrawal,
  getWithdrawalRequests,
  getTransactionDetails,
  requestPayment,
  approvePayment,
  rejectPayment,
  getPaymentRequests
};
