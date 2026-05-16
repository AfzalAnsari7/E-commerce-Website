const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

// frozen copy of the address at the time of ordering, so editing
// or deleting a saved address later never changes past orders
const shipAddressSchema = new mongoose.Schema(
  {
    fullName: String, phone: String, pincode: String,
    line1: String, line2: String, landmark: String,
    city: String, state: String, type: String,
  },
  { _id: false }
);

const trackStepSchema = new mongoose.Schema(
  {
    key: String,                 // placed | packed | shipped | out | delivered
    label: String,
    at: Date,                    // scheduled / actual time for this step
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => nanoid(10), unique: true, index: true },
    userId: { type: String, required: true, index: true },
    items: { type: Array, default: [] },
    total: { type: Number, default: 0 },
    status: { type: String, default: "placed" },
    address: { type: shipAddressSchema, required: true },
    paymentMethod: { type: String, default: "COD" }, // COD | Online
    // cod = pay on delivery; pending = online, awaiting payment;
    // paid = online payment captured; failed = payment failed
    paymentStatus: { type: String, default: "cod" },
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    timeline: { type: [trackStepSchema], default: [] },
    expectedDelivery: { type: Date },
    deliveryPartner: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      trackingId: { type: String, default: "" },
    },
    // step keys we've already emailed the customer about
    notified: { type: [String], default: [] },
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
