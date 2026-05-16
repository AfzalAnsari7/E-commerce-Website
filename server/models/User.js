const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

const addressSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => nanoid(8) },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },     // 10-digit
    pincode: { type: String, required: true },    // 6-digit
    line1: { type: String, required: true },      // house / building / street
    line2: { type: String, default: "" },         // area / colony
    landmark: { type: String, default: "" },
    city: { type: String, required: true },
    state: { type: String, required: true },
    type: { type: String, enum: ["Home", "Work", "Other"], default: "Home" },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => nanoid(8), unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    addresses: { type: [addressSchema], default: [] },
  },
  { timestamps: true }
);

// Never leak password / Mongo internals through the API
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
