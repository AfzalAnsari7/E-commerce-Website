const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

const orderSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => nanoid(10), unique: true, index: true },
    userId: { type: String, required: true, index: true },
    items: { type: Array, default: [] },
    total: { type: Number, default: 0 },
    status: { type: String, default: "placed" },
  },
  { timestamps: true }
);

orderSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Order", orderSchema);
