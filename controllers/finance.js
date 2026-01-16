const Balance = require("../models/balance");
const { AppError } = require("../utils/errors");
const User = require("../models/user");
const Transaction = require("../models/transaction");

/**
 * List all doctor balances (Debts)
 */
const listBalances = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {
      currentDebt: { $gt: 0 },
      totalIncome: { $gt: 0 }
    };
    
    // If search term provided, find doctors matching name
    if (search) {
      const doctors = await User.find({
        role: { $in: ["DOCTOR", "NURSE"] },
        fullName: { $regex: search, $options: "i" }
      }).select("_id");
      
      const doctorIds = doctors.map(d => d._id);
      query.doctor = { $in: doctorIds };
    }

    const total = await Balance.countDocuments(query);
    const balancesData = await Balance.find(query)
      .populate("doctor", "fullName email phone picture isBanned")
      .sort({ currentDebt: -1 }) // Show highest debt first
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Logic for tobeBanned
    const today = new Date();
    const currentDay = today.getDate();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const balances = balancesData.map(balance => {
      let tobeBanned = false;
      
      // "if lastWithdrawal is more than 5 days from the first day of this month"
      // Interpreted as: If today is after the 5th AND last payment was NOT in this month.
      if (currentDay > 5) {
        if (!balance.lastPaymentDate || new Date(balance.lastPaymentDate) < firstDayOfMonth) {
          tobeBanned = true;
        }
      }

      return {
        ...balance,
        tobeBanned
      };
    });

    res.status(200).json({
      success: true,
      data: {
        balances,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current doctor's balance
 */
const getMyBalance = async (req, res, next) => {
  try {
    const balance = await Balance.findOne({ doctor: req.user._id });
    
    res.status(200).json({
      success: true,
      data: balance || { currentDebt: 0, totalIncome: 0 }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Manually update a balance (Admin correction)
 */
const updateBalance = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { newAmount, notes } = req.body; 

    if (newAmount === undefined) {
      throw new AppError("newAmount is required", 400);
    }

    // Get current balance to calculate diff
    const currentBalance = await Balance.findOne({ doctor: doctorId });
    const oldDebt = currentBalance ? currentBalance.currentDebt : 0;
    const diff = newAmount - oldDebt;

    if (diff === 0) {
      return res.status(200).json({
        success: true,
        data: currentBalance,
        message: "No change in balance"
      });
    }

    const balance = await Balance.findOneAndUpdate(
      { doctor: doctorId },
      { 
        $set: { 
          currentDebt: newAmount,
          lastUpdated: new Date() 
        }
      },
      { upsert: true, new: true }
    );

    // Record this manual correction in transactions
    await Transaction.create({
      doctor: doctorId,
      amount: Math.abs(diff),
      type: "manual-correction",
      status: "completed",
      metadata: {
        previousDebt: oldDebt,
        newDebt: newAmount,
        correctionAmount: diff,
        notes: notes || "Manual adjustment by Admin",
        adminId: req.user._id,
        date: new Date()
      }
    });

    res.status(200).json({
      success: true,
      data: balance,
      message: "Balance updated successfully"
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listBalances,
  updateBalance,
  getMyBalance
};
