const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transaction");
const validator = require("../middlewares/validator");
const passport = require("passport");
const { authorize } = require("../middlewares/auth");
const path = require("path");

// Get transaction history for the authenticated professional
router.get(
  "/history",
  passport.authenticate("jwt", { session: false }),
  authorize("DOCTOR", "NURSE", "ADMIN"),
  transactionController.getTransactionHistory
);

// Get all withdrawal requests (admin only)
router.get(
  "/withdraw/requests",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  transactionController.getWithdrawalRequests
);

// Request a withdrawal for the authenticated professional
router.post(
  "/withdraw/request",
  passport.authenticate("jwt", { session: false }),
  authorize("DOCTOR", "NURSE"),
  transactionController.requestWithdrawal
);

// Approve a withdrawal request (admin only)
router.post(
  "/withdraw/approve/:withdrawalId",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  transactionController.approveWithdrawal
);

// Reject a withdrawal request (admin only)
router.post(
  "/withdraw/reject/:withdrawalId",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  transactionController.rejectWithdrawal
);

const { handleReceiptUpload } = require("../middlewares/receipts");

// Payment Requests (Doctor uploads receipt)
router.post(
  "/payment/request",
  passport.authenticate("jwt", { session: false }),
  authorize("DOCTOR"),
  handleReceiptUpload,
  transactionController.requestPayment
);

// Get Payment Requests (Admin)
router.get(
  "/payment/requests",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  transactionController.getPaymentRequests
);

// Approve Payment (Admin)
router.post(
  "/payment/approve/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  transactionController.approvePayment
);

// Reject Payment (Admin)
router.post(
  "/payment/reject/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  transactionController.rejectPayment
);

// Process payment withdrawal (legacy endpoint, kept for backward compatibility)
router.post(
  "/withdraw/process/:professionalId",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  transactionController.processWithdrawal
);

router.get(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  authorize("ADMIN"),
  transactionController.getTransactionDetails
);

module.exports = router;
