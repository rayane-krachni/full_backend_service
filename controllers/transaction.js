const transactionService = require("../services/transaction");
const { AppError } = require("../utils/errors");

/**
 * Get transaction history for the authenticated professional
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getTransactionHistory = async (req, res, next) => {
  try {
    let professionalId = req.user._id;
    if (req.user.role == "SUPER_ADMIN") professionalId = null;
    const options = {
      status: req.query.status,
      type: req.query.type,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    };

    const result = await transactionService.getTransactionHistory(
      professionalId,
      options
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all withdrawal requests for admin approval
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getWithdrawalRequests = async (req, res, next) => {
  try {
    const filter = req.query;

    const result = await transactionService.getWithdrawalRequests(filter);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process payment withdrawal for the authenticated professional
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
/**
 * Request a withdrawal for the authenticated professional
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const requestWithdrawal = async (req, res, next) => {
  try {
    const professionalId = req.user._id;

    const result = await transactionService.requestWithdrawal(professionalId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        data: {
          status: result.status,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: result,
      message: "Withdrawal request submitted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process withdrawal approval by admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const approveWithdrawal = async (req, res, next) => {
  try {
    const { withdrawalId } = req.params;

    const result = await transactionService.approveWithdrawal(withdrawalId);

    res.status(200).json({
      success: true,
      data: result,
      message: "Withdrawal approved successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject withdrawal request by admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const rejectWithdrawal = async (req, res, next) => {
  try {
    const { withdrawalId } = req.params;
    const { reason } = req.body;

    const result = await transactionService.rejectWithdrawal(
      withdrawalId,
      reason
    );

    res.status(200).json({
      success: true,
      data: result,
      message: "Withdrawal rejected successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process payment withdrawal for the authenticated professional
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const processWithdrawal = async (req, res, next) => {
  try {
    const professionalId = req.user._id;

    const result = await transactionService.processWithdrawal(professionalId);

    res.status(200).json({
      success: true,
      data: result,
      message: "Withdrawal processed successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get transaction details by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getTransactionDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await transactionService.getTransactionDetails(id);

    res.status(200).json({
      success: true,
      data: result,
      message: "Transaction details retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
};


/**
 * Request a payment (Doctor uploads receipt)
 */
const requestPayment = async (req, res, next) => {
  try {
    const professionalId = req.user._id;
    console.log(req.data)
    const paymentData = req.body;
    const result = await transactionService.requestPayment(professionalId, paymentData);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve a payment request
 */
const approvePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await transactionService.approvePayment(id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject a payment request
 */
const rejectPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await transactionService.rejectPayment(id, reason);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all payment requests for admin
 */
const getPaymentRequests = async (req, res, next) => {
  try {
    const filter = req.query;
    const result = await transactionService.getPaymentRequests(filter);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransactionHistory,
  getWithdrawalRequests,
  requestWithdrawal,
  approveWithdrawal,
  rejectWithdrawal,
  processWithdrawal,
  getTransactionDetails,
  requestPayment,
  approvePayment,
  rejectPayment,
  getPaymentRequests
};
