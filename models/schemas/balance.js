const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const balanceSchema = new Schema(
  {
    doctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    currentDebt: {
      type: Number,
      default: 0,
    },
    totalIncome: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    lastWithdrawal: {
      type: Date,
    },
    lastPaymentDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = balanceSchema;
