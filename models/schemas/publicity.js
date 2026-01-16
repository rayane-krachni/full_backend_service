// models/publicity.js
const { Schema, default: mongoose } = require("mongoose");
const mongooseLeanVirtuals = require("mongoose-lean-virtuals");
const mongooseUniqueValidator = require("mongoose-unique-validator");

const publicitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    picture: {
      type: String, // Will be handled by upload middleware
    },
    active: {
      type: Boolean,
      default: false
    },
    startDate: {
      type: Date,
      required: function() {
        return this.active;
      },
      validate: {
        validator: function(v) {
          return !this.endDate || v < this.endDate;
        },
        message: "Start date must be before end date"
      }
    },
    endDate: {
      type: Date,
      required: function() {
        return this.active;
      },
      validate: {
        validator: function(v) {
          return !this.startDate || v > this.startDate;
        },
        message: "End date must be after start date"
      }
    },
    link: {
      type: String,
      required: function() {
        return this.active;
      },
      validate: {
        validator: (v) => {
          return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(v);
        },
        message: props => `${props.value} is not a valid URL!`
      }
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Virtual for checking current active status
publicitySchema.virtual("isCurrentlyActive").get(function() {
  if (!this.active) return false;
  const now = new Date();
  return now >= this.startDate && now <= this.endDate;
});

// Indexes for better query performance
publicitySchema.index({ active: 1 });
publicitySchema.index({ startDate: 1, endDate: 1 });

// Pre-save validation
publicitySchema.pre("save", function(next) {
  if (this.active) {
    if (!this.startDate || !this.endDate) {
      throw new Error("Both start and end dates are required when publicity is active");
    }
    if (this.startDate >= this.endDate) {
      throw new Error("End date must be after start date");
    }
    if (!this.link) {
      throw new Error("Link is required when publicity is active");
    }
  }
  next();
});

// Helper methods
publicitySchema.methods.activate = function(startDate, endDate, link) {
  this.active = true;
  this.startDate = startDate;
  this.endDate = endDate;
  this.link = link;
  return this.save();
};

publicitySchema.methods.deactivate = function() {
  this.active = false;
  return this.save();
};

publicitySchema.plugin(mongooseLeanVirtuals);
publicitySchema.plugin(mongooseUniqueValidator);

module.exports = publicitySchema;
