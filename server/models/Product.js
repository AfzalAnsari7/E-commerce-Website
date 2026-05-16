const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

const productSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => nanoid(8), unique: true, index: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    mrp: { type: Number, default: 0 }, // 0 = no discount shown
    category: { type: String, default: "Men" },
    sizes: { type: [String], default: ["S", "M", "L", "XL", "XXL"] },
    image: { type: String, default: "https://picsum.photos/600/400" },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

// API shape: expose `id`, hide Mongo internals
productSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Product", productSchema);
