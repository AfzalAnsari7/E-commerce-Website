// server.js
require('dotenv').config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const rateLimit = require("express-rate-limit");

const Product = require("./models/Product");
const User = require("./models/User");
const Order = require("./models/Order");
const Review = require("./models/Review");

const app = express();
const PORT = process.env.PORT || 5000;
// Never fall back to a hard-coded secret: a known signing key lets
// anyone forge tokens (including admin). Refuse to boot without one.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 16) {
  console.error("FATAL: JWT_SECRET is missing or too short. Set a strong JWT_SECRET in the environment.");
  process.exit(1);
}
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/eshop";

// Render/most PaaS terminate TLS at a proxy and forward the real
// client IP in X-Forwarded-For. Trust the first hop so rate limiting
// keys on the real client, not the shared proxy IP.
app.set("trust proxy", 1);

// ----------------------
// Database
// ----------------------
async function connectDB() {
  await mongoose.connect(MONGODB_URI);
  console.log("MongoDB connected");
  await seedFromJSON();
}

// One-time migration: load the old JSON files into MongoDB if empty
async function seedFromJSON() {
  try {
    if ((await Product.countDocuments()) === 0) {
      const file = path.join(__dirname, "data", "products.json");
      if (fs.existsSync(file)) {
        const items = JSON.parse(fs.readFileSync(file));
        if (items.length) {
          await Product.insertMany(items, { ordered: false });
          console.log(`Seeded ${items.length} products from products.json`);
        }
      }
    }
    if ((await User.countDocuments()) === 0) {
      const file = path.join(__dirname, "data", "users.json");
      if (fs.existsSync(file)) {
        const users = JSON.parse(fs.readFileSync(file));
        if (users.length) {
          await User.insertMany(users, { ordered: false });
          console.log(`Seeded ${users.length} users from users.json`);
        }
      }
    }
  } catch (err) {
    console.error("Seed warning:", err.message);
  }
}

// ----------------------
// CORS
// ----------------------
// Origins allowed to call this API. localhost is for dev; the
// production frontend URL is supplied via the ALLOWED_ORIGINS env
// var (comma-separated) so deploys don't need a code change.
const allowedOrigins = [
  ...(process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : ['https://smart-e-commerce.netlify.app'])
];

// Returns true if the request origin may call this API. We never
// throw here: an unlisted origin simply gets no CORS headers, so the
// browser blocks it cleanly instead of the server returning a 500.
function isAllowedOrigin(origin) {
  // Non-browser callers (curl, server-to-server) send no Origin.
  if (!origin) return true;
  // Any localhost port for local dev (Vite may pick 5173, 5174, ...).
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
  return allowedOrigins.includes(origin);
}

const corsOptions = {
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

// Same options for preflight and actual requests so they can't disagree.
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: "8mb" })); // headroom for review photos

// AI shopping assistant (Google Gemini) — see routes/chat.js
app.use("/api/chat", require("./routes/chat"));

// ----------------------
// Rate limiting (brute-force / abuse protection on auth routes)
// ----------------------
const rlJson = (req, res) =>
  res.status(429).json({ message: "Too many requests. Please try again later." });

// Login / OTP-verify / reset-confirm: tight, these are guessable secrets
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rlJson,
});

// Anything that triggers an outbound email (OTP / reset code): even
// tighter, so the endpoint can't be used to spam mail or burn SMTP quota
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rlJson,
});

// ----------------------
// OTP SYSTEM
// ----------------------
const otpStore = {}; // { email: { otp, expiresAt, attempts } }
const resetStore = {}; // { email: { code, expiresAt, attempts } }

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


// Admin: promote/demote a user to/from admin
app.put("/api/admin/users/:id/admin", authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Forbidden" });
    const { isAdmin } = req.body;
    if (typeof isAdmin !== "boolean") return res.status(400).json({ message: "isAdmin must be boolean" });

    const user = await User.findOneAndUpdate({ id: req.params.id }, { isAdmin }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ id: user.id, email: user.email, isAdmin: user.isAdmin });
  } catch (err) {
    console.error("set admin failed:", err.message);
    res.status(500).json({ message: "Failed to update user" });
  }
});

// Gmail rejects/penalises a From that isn't the authenticated account,
// so when real SMTP is configured we send as that address. In Ethereal
// (dev) mode there is no SMTP_USER, so keep the branded placeholder.
const MAIL_FROM = process.env.SMTP_USER
  ? `"Axen Wear" <${process.env.SMTP_USER}>`
  : '"Axen Wear" <no-reply@axenwear.com>';

function htmlOtpTemplate(name, otp) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2 style="color:#2b6cb0">Axen Wear — Verify your email</h2>
      <p>Hi ${name},</p>
      <p>Your verification code is:</p>
      <div style="font-size:30px; font-weight:bold; background:#f3f6fb; padding:10px; display:inline-block; letter-spacing:4px;">
        ${otp}
      </div>
      <p>This code will expire in 5 minutes.</p>
      <p style="color:#666; font-size:13px">If you didn't request this, you can ignore this email.</p>
    </div>`;
}

function htmlResetTemplate(name, code) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2 style="color:#2b6cb0">Axen Wear — Reset your password</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your password. Use this code:</p>
      <div style="font-size:30px; font-weight:bold; background:#f3f6fb; padding:10px; display:inline-block; letter-spacing:4px;">
        ${code}
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p style="color:#666; font-size:13px">If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>
    </div>`;
}

async function createTransporter() {
  if (process.env.USE_ETHEREAL === "true") {
    const testAccount = await nodemailer.createTestAccount();
    console.log("Ethereal account:", testAccount);
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
  } else {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error("SMTP_USER and SMTP_PASS must be set in environment variables");
    }
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
}

// Reuse one transporter for order emails (don't spin up a new
// Ethereal account on every send like the OTP flow does)
let _orderMailer = null;
async function getOrderMailer() {
  if (!_orderMailer) _orderMailer = await createTransporter();
  return _orderMailer;
}

const STAGE_COPY = {
  placed:    { subject: "Order Confirmed", line: "We've received your order and it's being prepared." },
  packed:    { subject: "Order Packed",    line: "Your order has been packed and is ready to ship." },
  shipped:   { subject: "Order Shipped",   line: "Good news — your order has been shipped!" },
  out:       { subject: "Out for Delivery", line: "Your order is out for delivery and arriving today." },
  delivered: { subject: "Order Delivered", line: "Your order has been delivered. We hope you love it!" },
};

function orderEmailHtml(order, stageKey) {
  const c = STAGE_COPY[stageKey] || STAGE_COPY.placed;
  const a = order.address || {};
  const items = (order.items || [])
    .map(
      (it) =>
        `<tr><td style="padding:6px 0">${it.title} ${
          it.size ? `(Size ${it.size})` : ""
        } × ${it.qty}</td><td align="right">₹${it.price * it.qty}</td></tr>`
    )
    .join("");
  const eta = order.expectedDelivery
    ? new Date(order.expectedDelivery).toDateString()
    : "soon";
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #eee;border-radius:10px;overflow:hidden">
    <div style="background:#1a1a1a;color:#fff;padding:20px 24px">
      <h2 style="margin:0">AXEN <span style="background:#f4c542;color:#1a1a1a;padding:0 6px;border-radius:4px">WEAR</span></h2>
    </div>
    <div style="padding:24px">
      <h3 style="margin:0 0 6px">${c.subject}</h3>
      <p style="color:#555;margin:0 0 18px">${c.line}</p>
      <p style="margin:0 0 4px"><strong>Order ID:</strong> ${order.id}</p>
      <p style="margin:0 0 4px"><strong>Tracking ID:</strong> ${
        order.deliveryPartner?.trackingId || "—"
      } (${order.deliveryPartner?.name || "Courier"})</p>
      <p style="margin:0 0 18px"><strong>Expected delivery:</strong> ${eta}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;border-top:1px solid #eee;border-bottom:1px solid #eee;margin-bottom:12px">
        ${items}
      </table>
      <p style="text-align:right;font-size:16px;margin:0 0 18px"><strong>Total: ₹${
        order.total
      }</strong> (${order.paymentMethod})</p>
      <p style="color:#555;font-size:13px;margin:0">
        Deliver to: ${a.fullName}, ${a.line1}${a.line2 ? ", " + a.line2 : ""}, ${
    a.city
  }, ${a.state} - ${a.pincode}. Ph: ${a.phone}
      </p>
    </div>
    <div style="background:#fafafa;padding:14px 24px;color:#999;font-size:12px;text-align:center">
      Axen Wear · This is an automated update for order ${order.id}
    </div>
  </div>`;
}

// Send a stage email; never throws (order flow must not break on mail)
async function sendOrderEmail(order, stageKey) {
  try {
    const user = await User.findOne({ id: order.userId });
    if (!user || !user.email) return;
    const c = STAGE_COPY[stageKey] || STAGE_COPY.placed;
    const transporter = await getOrderMailer();
    const info = await transporter.sendMail({
      from: MAIL_FROM,
      to: user.email,
      subject: `${c.subject} · Order ${order.id} · Axen Wear`,
      html: orderEmailHtml(order, stageKey),
    });
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log(`📧 ${stageKey} email for ${order.id}: ${preview}`);
  } catch (e) {
    console.error(`order email (${stageKey}) failed:`, e.message);
  }
}

// Background watcher: every minute, email any order whose timeline
// step time has passed but the customer hasn't been notified yet
function startOrderNotifier() {
  setInterval(async () => {
    try {
      const now = Date.now();
      // older orders may lack timeline/notified entirely — $ifNull
      // keeps $size from erroring and skips them (0 < 0 is false)
      const orders = await Order.find({
        // skip online orders that were never paid (or failed)
        paymentStatus: { $nin: ["pending", "failed"] },
        $expr: {
          $lt: [
            { $size: { $ifNull: ["$notified", []] } },
            { $size: { $ifNull: ["$timeline", []] } },
          ],
        },
      });
      for (const o of orders) {
        let changed = false;
        for (const step of o.timeline) {
          if (
            new Date(step.at).getTime() <= now &&
            !o.notified.includes(step.key)
          ) {
            await sendOrderEmail(o, step.key);
            o.notified.push(step.key);
            changed = true;
          }
        }
        if (changed) await o.save();
      }
    } catch (e) {
      console.error("order notifier tick failed:", e.message);
    }
  }, 60 * 1000);
}

// ----------------------
// AUTH + OTP ROUTES
// ----------------------

// Request OTP
app.post("/api/auth/request-otp", emailLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Missing fields" });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const otp = generateOtp();
    otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 };

    const transporter = await createTransporter();
    const info = await transporter.sendMail({
      from: MAIL_FROM,
      to: email,
      subject: "Verify your email",
      html: htmlOtpTemplate(name, otp)
    });

    return res.json({ message: "OTP sent", preview: nodemailer.getTestMessageUrl(info) });
  } catch (err) {
    console.error("request-otp failed:", err.message);
    return res.status(500).json({ message: "Failed to send OTP email" });
  }
});

// Verify OTP -> create user
app.post("/api/auth/verify-otp", authLimiter, async (req, res) => {
  try {
    const { email, otp, name, password } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Missing fields" });

    const record = otpStore[email];
    if (!record) return res.status(400).json({ message: "No OTP requested" });
    if (Date.now() > record.expiresAt) {
      delete otpStore[email];
      return res.status(400).json({ message: "OTP expired" });
    }
    // A 6-digit OTP is trivially brute-forceable without a cap. Burn
    // the OTP after 5 wrong tries so the attacker must request a new one.
    if (record.attempts >= 5) {
      delete otpStore[email];
      return res.status(400).json({ message: "Too many attempts. Request a new code." });
    }
    if (record.otp !== otp) {
      record.attempts += 1;
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (!password || String(password).length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    const hashed = bcrypt.hashSync(password, 8);
    const newUser = await User.create({ name, email, password: hashed, isAdmin: false });
    delete otpStore[email];

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, isAdmin: newUser.isAdmin },
      JWT_SECRET, { expiresIn: "7d" }
    );
    res.json({
      message: "OTP verified, registration successful",
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, isAdmin: newUser.isAdmin }
    });
  } catch (err) {
    console.error("verify-otp failed:", err.message);
    res.status(500).json({ message: "Registration failed" });
  }
});

// Login
app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Missing fields" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    if (!bcrypt.compareSync(password, user.password))
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, email: user.email, isAdmin: user.isAdmin },
      JWT_SECRET, { expiresIn: "7d" }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
  } catch (err) {
    console.error("login failed:", err.message);
    res.status(500).json({ message: "Login failed" });
  }
});

// Forgot password -> email a reset code (works for any user, incl. admins)
app.post("/api/auth/forgot-password", emailLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    // Always reply the same way so we never reveal which emails exist
    if (!user) {
      return res.json({ message: "If that account exists, a reset code has been sent." });
    }

    const code = generateOtp();
    resetStore[user.email] = {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
    };

    const transporter = await createTransporter();
    const info = await transporter.sendMail({
      from: MAIL_FROM,
      to: user.email,
      subject: "Reset your password",
      html: htmlResetTemplate(user.name, code),
    });

    const preview = nodemailer.getTestMessageUrl(info);
    // Dev only: print the code straight to the server console so you
    // don't need to open the Ethereal preview while testing.
    if (process.env.USE_ETHEREAL === "true") {
      console.log(`🔑 Password reset code for ${user.email}: ${code}  (preview: ${preview})`);
    }

    return res.json({
      message: "If that account exists, a reset code has been sent.",
      preview, // dev-only Ethereal link
    });
  } catch (err) {
    console.error("forgot-password failed:", err.message);
    return res.status(500).json({ message: "Failed to send reset email" });
  }
});

// Reset password using the emailed code
app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
  try {
    const { email, code, password } = req.body;
    if (!email || !code || !password)
      return res.status(400).json({ message: "Missing fields" });
    if (String(password).length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    const key = email.toLowerCase();
    const record = resetStore[key];
    if (!record) return res.status(400).json({ message: "No reset requested" });
    if (Date.now() > record.expiresAt) {
      delete resetStore[key];
      return res.status(400).json({ message: "Reset code expired" });
    }
    if (record.attempts >= 5) {
      delete resetStore[key];
      return res.status(400).json({ message: "Too many attempts. Request a new code." });
    }
    if (record.code !== String(code)) {
      record.attempts += 1;
      return res.status(400).json({ message: "Invalid reset code" });
    }

    const user = await User.findOne({ email: key });
    if (!user) return res.status(400).json({ message: "Invalid reset code" });

    user.password = bcrypt.hashSync(password, 8);
    await user.save();
    delete resetStore[key];

    return res.json({ message: "Password reset successful. You can now log in." });
  } catch (err) {
    console.error("reset-password failed:", err.message);
    return res.status(500).json({ message: "Password reset failed" });
  }
});

// ----------------------
// PRODUCTS
// ----------------------
app.get("/api/products", async (req, res) => {
  try {
    const { category, q } = req.query;
    const filter = {};
    if (category && category !== "All") filter.category = String(category);
    // Escape regex metacharacters and cap length: an un-escaped raw
    // query lets a client pass a catastrophic-backtracking pattern
    // (ReDoS) that hangs the event loop. Also coerces ?q[]= arrays
    // to a string so it can't become a query operator.
    if (q) {
      const safe = String(q).slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.title = { $regex: safe, $options: "i" };
    }
    const products = await Product.find(filter).sort({ createdAt: 1 });

    // Attach average rating + review count per product (for product-card stars).
    const ids = products.map((p) => p.id);
    const stats = await Review.aggregate([
      { $match: { productId: { $in: ids } } },
      { $group: { _id: "$productId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    const byId = {};
    stats.forEach((s) => { byId[String(s._id)] = s; });

    const out = products.map((p) => {
      const obj = p.toJSON(); // applies schema transform (strips _id/__v, exposes id)
      const s = byId[p.id];
      return {
        ...obj,
        rating: s ? Math.round(s.avg * 10) / 10 : 0,
        ratingCount: s ? s.count : 0,
      };
    });
    res.json(out);
  } catch (err) {
    console.error("load products failed:", err.message);
    res.status(500).json({ message: "Failed to load products" });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const p = await Product.findOne({ id: req.params.id });
    if (!p) return res.status(404).json({ message: "Not found" });
    res.json(p);
  } catch (err) {
    console.error("load product failed:", err.message);
    res.status(500).json({ message: "Failed to load product" });
  }
});

// ----------------------
// REVIEWS / RATINGS
// ----------------------
app.get("/api/products/:id/reviews", async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.id }).sort({ createdAt: -1 });
    const count = reviews.length;
    const average = count
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
      : 0;
    res.json({ average, count, reviews });
  } catch (err) {
    console.error("load reviews failed:", err.message);
    res.status(500).json({ message: "Failed to load reviews" });
  }
});

app.post("/api/products/:id/reviews", authMiddleware, async (req, res) => {
  try {
    const { rating, comment, images } = req.body;
    const r = Number(rating);
    if (!r || r < 1 || r > 5) return res.status(400).json({ message: "Rating must be 1–5" });

    // up to 4 image data-URIs, each ≤ ~1.5MB
    const photos = Array.isArray(images)
      ? images
          .filter((s) => typeof s === "string" && s.startsWith("data:image/"))
          .slice(0, 4)
          .filter((s) => s.length <= 1_500_000)
      : [];

    const product = await Product.findOne({ id: req.params.id });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const dbUser = await User.findOne({ id: req.user.id });
    const userName = dbUser ? dbUser.name : "Customer";

    // one review per user/product — update if it exists
    const review = await Review.findOneAndUpdate(
      { productId: req.params.id, userId: req.user.id },
      { rating: r, comment: comment || "", userName, images: photos },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(review);
  } catch (err) {
    console.error("review failed:", err.message);
    res.status(500).json({ message: "Failed to submit review" });
  }
});

// ----------------------
// Auth middleware
// ----------------------
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "Unauthorized" });
  try {
    req.user = jwt.verify(auth.split(" ")[1], JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// Admin: add product
app.post("/api/admin/products", authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Forbidden" });
    const { title, price, mrp, image, description, category, sizes } = req.body;
    if (!title || !price) return res.status(400).json({ message: "Missing fields" });

    const newProduct = await Product.create({
      title,
      price,
      mrp: Number(mrp) || 0,
      category: category || "Men",
      ...(Array.isArray(sizes) && sizes.length ? { sizes } : {}),
      image: image || "https://picsum.photos/600/400",
      description: description || "",
    });
    res.json(newProduct);
  } catch (err) {
    console.error("add product failed:", err.message);
    res.status(500).json({ message: "Failed to add product" });
  }
});

// Admin: update a product (all fields editable)
app.put("/api/admin/products/:id", authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Forbidden" });
    const { title, price, mrp, category, image, description, sizes } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (price !== undefined) update.price = Number(price);
    if (mrp !== undefined) update.mrp = Number(mrp) || 0;
    if (category !== undefined) update.category = category;
    if (image !== undefined) update.image = image;
    if (description !== undefined) update.description = description;
    if (Array.isArray(sizes)) update.sizes = sizes;

    const product = await Product.findOneAndUpdate(
      { id: req.params.id },
      { $set: update },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: "Not found" });
    res.json(product);
  } catch (err) {
    console.error("update product failed:", err.message);
    res.status(500).json({ message: "Failed to update product" });
  }
});

// Admin: delete a single product
app.delete("/api/admin/products/:id", authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Forbidden" });
    const r = await Product.deleteOne({ id: req.params.id });
    if (r.deletedCount === 0) return res.status(404).json({ message: "Not found" });
    res.json({ message: "deleted", id: req.params.id });
  } catch (err) {
    console.error("delete product failed:", err.message);
    res.status(500).json({ message: "Failed to delete product" });
  }
});

// Admin: bulk delete every product in a category
app.delete("/api/admin/products", authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Forbidden" });
    const { category } = req.query;
    if (!category) return res.status(400).json({ message: "category is required" });
    const r = await Product.deleteMany({ category });
    res.json({ message: "deleted", count: r.deletedCount, category });
  } catch (err) {
    console.error("bulk delete failed:", err.message);
    res.status(500).json({ message: "Failed to delete products" });
  }
});

// ----------------------
// Saved addresses (per user)
// ----------------------
function validateAddress(a) {
  if (!a || typeof a !== "object") return "Address required";
  const need = ["fullName", "phone", "pincode", "line1", "city", "state"];
  for (const f of need) if (!String(a[f] || "").trim()) return `Missing ${f}`;
  if (!/^\d{10}$/.test(String(a.phone))) return "Phone must be 10 digits";
  if (!/^\d{6}$/.test(String(a.pincode))) return "Pincode must be 6 digits";
  return null;
}
function cleanAddress(a) {
  return {
    fullName: String(a.fullName).trim(),
    phone: String(a.phone).trim(),
    pincode: String(a.pincode).trim(),
    line1: String(a.line1).trim(),
    line2: String(a.line2 || "").trim(),
    landmark: String(a.landmark || "").trim(),
    city: String(a.city).trim(),
    state: String(a.state).trim(),
    type: ["Home", "Work", "Other"].includes(a.type) ? a.type : "Home",
  };
}

app.get("/api/addresses", authMiddleware, async (req, res) => {
  try {
    const u = await User.findOne({ id: req.user.id });
    if (!u) return res.status(404).json({ message: "User not found" });
    res.json(u.addresses || []);
  } catch (err) {
    console.error("load addresses failed:", err.message);
    res.status(500).json({ message: "Failed to load addresses" });
  }
});

app.post("/api/addresses", authMiddleware, async (req, res) => {
  try {
    const err = validateAddress(req.body);
    if (err) return res.status(400).json({ message: err });
    const u = await User.findOne({ id: req.user.id });
    if (!u) return res.status(404).json({ message: "User not found" });
    const addr = cleanAddress(req.body);
    addr.isDefault = u.addresses.length === 0 || !!req.body.isDefault;
    if (addr.isDefault) u.addresses.forEach((x) => (x.isDefault = false));
    u.addresses.push(addr);
    await u.save();
    res.json(u.addresses);
  } catch (e) {
    console.error("add address failed:", e.message);
    res.status(500).json({ message: "Failed to save address" });
  }
});

app.put("/api/addresses/:addrId", authMiddleware, async (req, res) => {
  try {
    const err = validateAddress(req.body);
    if (err) return res.status(400).json({ message: err });
    const u = await User.findOne({ id: req.user.id });
    const a = u && u.addresses.find((x) => x.id === req.params.addrId);
    if (!a) return res.status(404).json({ message: "Address not found" });
    Object.assign(a, cleanAddress(req.body));
    if (req.body.isDefault) {
      u.addresses.forEach((x) => (x.isDefault = false));
      a.isDefault = true;
    }
    await u.save();
    res.json(u.addresses);
  } catch (e) {
    res.status(500).json({ message: "Failed to update address" });
  }
});

app.delete("/api/addresses/:addrId", authMiddleware, async (req, res) => {
  try {
    const u = await User.findOne({ id: req.user.id });
    if (!u) return res.status(404).json({ message: "User not found" });
    const wasDefault = u.addresses.find((x) => x.id === req.params.addrId)?.isDefault;
    u.addresses = u.addresses.filter((x) => x.id !== req.params.addrId);
    if (wasDefault && u.addresses.length) u.addresses[0].isDefault = true;
    await u.save();
    res.json(u.addresses);
  } catch {
    res.status(500).json({ message: "Failed to delete address" });
  }
});

// ----------------------
// Orders + live tracking
// ----------------------
const DELIVERY_PARTNERS = [
  { name: "Axen Express", phone: "+91 1800-200-1111" },
  { name: "BlueDart Logistics", phone: "+91 1800-233-1234" },
  { name: "Delhivery", phone: "+91 1800-103-7676" },
  { name: "Ekart Logistics", phone: "+91 1800-208-9898" },
];
const HOUR = 3600 * 1000;
// each step's offset from order time; tracking advances on its own
const TRACK_PLAN = [
  { key: "placed", label: "Order Placed", offset: 0 },
  { key: "packed", label: "Packed", offset: 8 * HOUR },
  { key: "shipped", label: "Shipped", offset: 24 * HOUR },
  { key: "out", label: "Out for Delivery", offset: 72 * HOUR },
  { key: "delivered", label: "Delivered", offset: 96 * HOUR },
];

// derive how far the order has progressed based on elapsed time
function withTracking(orderDoc) {
  const o = orderDoc.toJSON();
  const now = Date.now();
  const steps = (o.timeline || []).map((s) => ({
    ...s,
    done: new Date(s.at).getTime() <= now,
  }));
  const lastDone = [...steps].reverse().find((s) => s.done);
  o.status = lastDone ? lastDone.key : "placed";
  o.statusLabel = lastDone ? lastDone.label : "Order Placed";
  o.tracking = steps;
  return o;
}

// total is always recomputed server-side from item prices — never
// trust an amount sent by the client
function orderTotal(items) {
  return items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 1), 0);
}

// shared scaffolding for a new order (timeline, courier, tracking id)
function buildOrderScaffold(items) {
  const start = Date.now();
  const timeline = TRACK_PLAN.map((s) => ({
    key: s.key,
    label: s.label,
    at: new Date(start + s.offset),
  }));
  const partner = DELIVERY_PARTNERS[Math.floor(Math.random() * DELIVERY_PARTNERS.length)];
  const trackingId =
    "AXN" + Math.random().toString(36).slice(2, 8).toUpperCase() +
    String(start).slice(-4);
  return {
    total: orderTotal(items),
    timeline,
    expectedDelivery: timeline[timeline.length - 1].at,
    deliveryPartner: { name: partner.name, phone: partner.phone, trackingId },
  };
}

function sendPlacedEmail(order) {
  sendOrderEmail(order, "placed").then(async () => {
    try {
      order.notified = ["placed"];
      await order.save();
    } catch { /* watcher will retry if this fails */ }
  });
}

// lazy Razorpay client; only built if keys are configured
let _rzp = null;
function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  if (!_rzp)
    _rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  return _rzp;
}

// ---- Cash on Delivery: order is placed immediately ----
app.post("/api/orders", authMiddleware, async (req, res) => {
  try {
    const { items, address } = req.body;
    if (!items || !Array.isArray(items) || !items.length)
      return res.status(400).json({ message: "Invalid order" });
    const addrErr = validateAddress(address);
    if (addrErr) return res.status(400).json({ message: addrErr });

    const scaffold = buildOrderScaffold(items);
    const order = await Order.create({
      userId: req.user.id,
      items,
      address: cleanAddress(address),
      paymentMethod: "COD",
      paymentStatus: "cod",
      ...scaffold,
    });
    sendPlacedEmail(order);
    res.json({ orderId: order.id, itemsCount: items.length, total: scaffold.total });
  } catch (err) {
    console.error("order failed:", err.message);
    res.status(500).json({ message: "Failed to place order" });
  }
});

// ---- Online payment step 1: create a Razorpay order ----
app.post("/api/payment/create", authMiddleware, async (req, res) => {
  try {
    const rzp = getRazorpay();
    if (!rzp)
      return res.status(503).json({ message: "Online payment is not configured" });

    const { items, address } = req.body;
    if (!items || !Array.isArray(items) || !items.length)
      return res.status(400).json({ message: "Invalid order" });
    const addrErr = validateAddress(address);
    if (addrErr) return res.status(400).json({ message: addrErr });

    const scaffold = buildOrderScaffold(items);

    // our order, parked as unpaid until payment is verified
    const order = await Order.create({
      userId: req.user.id,
      items,
      address: cleanAddress(address),
      paymentMethod: "Online",
      paymentStatus: "pending",
      ...scaffold,
    });

    const rpOrder = await rzp.orders.create({
      amount: Math.round(scaffold.total * 100), // paise
      currency: "INR",
      receipt: order.id,
    });
    order.razorpayOrderId = rpOrder.id;
    await order.save();

    const user = await User.findOne({ id: req.user.id });
    res.json({
      orderId: order.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: rpOrder.id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      name: user ? user.name : "",
      email: user ? user.email : "",
      contact: address.phone,
    });
  } catch (err) {
    console.error("payment create failed:", err.message);
    res.status(500).json({ message: "Could not start payment" });
  }
});

// ---- Online payment step 2: verify signature, mark paid ----
app.post("/api/payment/verify", authMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({ message: "Missing payment fields" });

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.userId !== req.user.id)
      return res.status(403).json({ message: "Forbidden" });

    if (expected !== razorpay_signature) {
      order.paymentStatus = "failed";
      await order.save();
      return res.status(400).json({ message: "Payment verification failed" });
    }

    order.paymentStatus = "paid";
    order.razorpayPaymentId = razorpay_payment_id;
    await order.save();
    sendPlacedEmail(order);
    res.json({ orderId: order.id, total: order.total });
  } catch (err) {
    console.error("payment verify failed:", err.message);
    res.status(500).json({ message: "Payment verification error" });
  }
});

// All orders for the logged-in user (My Orders)
app.get("/api/orders", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(orders.map(withTracking));
  } catch (err) {
    console.error("load orders failed:", err.message);
    res.status(500).json({ message: "Failed to load orders" });
  }
});

// One order (invoice / confirmation / tracking page)
app.get("/api/orders/:id", authMiddleware, async (req, res) => {
  try {
    const order = await Order.findOne({ id: req.params.id });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.userId !== req.user.id && !req.user.isAdmin)
      return res.status(403).json({ message: "Forbidden" });
    res.json(withTracking(order));
  } catch (err) {
    console.error("load order failed:", err.message);
    res.status(500).json({ message: "Failed to load order" });
  }
});

// ---- Admin: list every order ----
app.get("/api/admin/orders", authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Forbidden" });
    const orders = await Order.find().sort({ createdAt: -1 }).limit(200);
    const users = await User.find();
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));
    const out = orders.map((o) => {
      const t = withTracking(o);
      const u = byId[o.userId];
      t.customerName = u ? u.name : "—";
      t.customerEmail = u ? u.email : "—";
      return t;
    });
    res.json(out);
  } catch (err) {
    console.error("admin orders failed:", err.message);
    res.status(500).json({ message: "Failed to load orders" });
  }
});

// ---- Admin: manually move an order to a stage ----
app.put("/api/admin/orders/:id/status", authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Forbidden" });

    const targetKey = req.body.status;
    const ti = TRACK_PLAN.findIndex((s) => s.key === targetKey);
    if (ti === -1) return res.status(400).json({ message: "Invalid status" });

    const order = await Order.findOne({ id: req.params.id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const now = Date.now();
    const baseOffset = TRACK_PLAN[ti].offset;
    // rebuild the timeline: chosen stage + earlier = done now,
    // later stages keep their relative cadence going forward
    order.timeline = TRACK_PLAN.map((s, i) => ({
      key: s.key,
      label: s.label,
      at: new Date(i <= ti ? now : now + (s.offset - baseOffset)),
    }));
    order.expectedDelivery = order.timeline[order.timeline.length - 1].at;
    await order.save();

    // email the customer for any stage that just became complete
    for (const step of order.timeline) {
      if (
        new Date(step.at).getTime() <= now &&
        !order.notified.includes(step.key)
      ) {
        await sendOrderEmail(order, step.key);
        order.notified.push(step.key);
      }
    }
    await order.save();
    res.json(withTracking(order));
  } catch (err) {
    console.error("admin status update failed:", err.message);
    res.status(500).json({ message: "Failed to update status" });
  }
});

// ----------------------
// Start
// ----------------------
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    startOrderNotifier();
    console.log("Order notifier started (stage emails every 60s)");
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
