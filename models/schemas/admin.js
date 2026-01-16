const { default: mongoose } = require("mongoose");
const mongooseLeanVirtuals = require("mongoose-lean-virtuals");
const mongooseUniqueValidator = require("mongoose-unique-validator");
const enums = require("../../static/public/enums/admin.json");

const schema = mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      index: {
        unique: true,
        partialFilterExpression: {
          isDeleted: false,
        },
      },
    },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["SUPER_ADMIN", ...enums.role.map((e) => e.value)],
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

schema.plugin(mongooseLeanVirtuals);
schema.plugin(mongooseUniqueValidator, {
  message:
    "La valeur '{VALUE}' du champ #'{PATH}'# est déjà utilisée par un autre admin.",
});

module.exports = schema;
