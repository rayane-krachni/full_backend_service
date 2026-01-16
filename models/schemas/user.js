const { Schema, model, mongoose } = require("mongoose");
const mongooseLeanVirtuals = require("mongoose-lean-virtuals");
const mongooseUniqueValidator = require("mongoose-unique-validator");
const QRCode = require("qrcode");

const baseSchema = new Schema(
  {
    token: String,
    firebaseToken: String,
    email: {
      type: String,
      unique: true,
      sparse: true,
      validate: {
        validator: function (v) {
          return this.phoneNumber ? true : !!v;
        },
        message: "Email or phone number is required",
      },
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    passwordHash: { type: String },
    passwordSalt: { type: String },
    role: {
      type: String,
      enum: ["PATIENT", "DOCTOR", "NURSE", "EMPLOYEE"],
      required: true,
    },
    fullName: { type: String, required: true },
    picture: String,
    address: {
      wilaya: String,
      city: String,
      street: String,
      gps: { lat: Number, lng: Number },
    },
    language: { type: String, default: "fr" },
    account_pin: {
      type: Number,
      default: 0,
    },
    password_pin: {
      type: Number,
      default: 0,
    },
    phoneSerialCode: { type: String, unique: true, sparse: true },
    isTrial: {
      type: Boolean,
      required: true,
      default: true,
    },
    isActive: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    lastLogin: Date,
    isFamilyAccount: {
      type: Boolean,
      default: false,
    },
    responsibleId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    familyMembers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    relationshipType: {
      type: String,
      enum: ["PRIMARY", "SPOUSE", "CHILD", "PARENT", "OTHER"],
      default: "PRIMARY",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
    discriminatorKey: "role",
    
  }
);
baseSchema.virtual("qrCodeImage").get(async function () {
  // If QR code exists, return it
  if (this.qrCode) return this.qrCode;

  // Auto-generate if missing
  if (this._id) {
    try {
      const url = `user:${this._id}`;
      this.qrCode = await QRCode.toDataURL(url);
      // Use the model from the schema to update the document
      const UserModel = mongoose.model('User');
      await UserModel.findByIdAndUpdate(this._id, {
        qrCode: this.qrCode,
      });
      return this.qrCode;
    } catch (err) {
      console.error("Error auto-generating QR code:", err);
      return null;
    }
  }
  return null;
});

// Pre-save hook for new users
baseSchema.pre("save", async function (next) {
  if (this.isNew && !this.qrCode && this._id) {
    try {
      const url = `user:${this._id}`;
      this.qrCode = await QRCode.toDataURL(url);
    } catch (err) {
      console.error("Error generating QR code in pre-save:", err);
    }
  }
  next();
});

// Post-find hook to auto-generate for lean queries
baseSchema.post(["find", "findOne"], async function (docs) {
  if (!docs) return;

  const processDoc = async (doc) => {
    if (!doc.qrCode && doc._id) {
      try {
        const url = `user:${doc._id}`;
        const qrCode = await QRCode.toDataURL(url);
        await this.model.updateOne({ _id: doc._id }, { qrCode });
        doc.qrCode = qrCode;
      } catch (err) {
        console.error("Error generating QR code in post-find:", err);
      }
    }
  };

  if (Array.isArray(docs)) {
    await Promise.all(docs.map(processDoc));
  } else if (docs) {
    await processDoc(docs);
  }
});
baseSchema.pre("validate", function (next) {
  if (this.role === "PATIENT") {
    if (!this.passwordHash) {
      this.invalidate("passwordHash", "Path `passwordHash` is required.");
    }
    if (!this.passwordSalt) {
      this.invalidate("passwordSalt", "Path `passwordSalt` is required.");
    }
    if (!this.fullName) {
      this.invalidate("fullName", "Path `fullName` is required.");
    }
    if (!this.email) {
      this.invalidate("email", "Either email or phone number is required.");
    }
  }
  next();
});
// baseSchema.plugin(mongooseIdValidator, {
//   message: "invalid_reference_{PATH}".toLowerCase(),
// });
baseSchema.plugin(mongooseLeanVirtuals);
baseSchema.plugin(mongooseUniqueValidator, {
  message:
    "La valeur '{VALUE}' du champ #'{PATH}'# est déjà utilisée dans un autre utilisateur.",
});
module.exports = baseSchema;
