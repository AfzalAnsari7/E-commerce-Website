const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

const reviewSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => nanoid(10), unique: true, index: true },
    productId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
    images: { type: [String], default: [] }, // base64 data URIs (client-compressed)
  },
  { timestamps: true }
);

// one review per user per product
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

reviewSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Review", reviewSchema);
