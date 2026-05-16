const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

const userSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => nanoid(8), unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
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
