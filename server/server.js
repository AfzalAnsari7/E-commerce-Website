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

const Product = require("./models/Product");
const User = require("./models/User");
const Order = require("./models/Order");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/eshop";

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
const allowedOrigins = [
  'https://smart-e-commerce.netlify.app',
  'http://localhost:5173'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy: This origin is not allowed'), false);
    }
    return callback(null, true);
  },
  methods: ['GET','POST','PUT','DELETE'],
  credentials: true
}));
app.options('*', cors());

app.use(express.json());

// ----------------------
// OTP SYSTEM
// ----------------------
const otpStore = {}; // { email: { otp, expiresAt, attempts } }

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

// ----------------------
// AUTH + OTP ROUTES
// ----------------------

// Request OTP
app.post("/api/auth/request-otp", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Missing fields" });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const otp = generateOtp();
    otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 };

    const transporter = await createTransporter();
    const info = await transporter.sendMail({
      from: '"Axen Wear" <no-reply@axenwear.com>',
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
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp, name, password } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Missing fields" });

    const record = otpStore[email];
    if (!record) return res.status(400).json({ message: "No OTP requested" });
    if (Date.now() > record.expiresAt) return res.status(400).json({ message: "OTP expired" });
    if (record.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

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
app.post("/api/auth/login", async (req, res) => {
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

// ----------------------
// PRODUCTS
// ----------------------
app.get("/api/products", async (req, res) => {
  try {
    const { category, q } = req.query;
    const filter = {};
    if (category && category !== "All") filter.category = category;
    if (q) filter.title = { $regex: q, $options: "i" };
    const products = await Product.find(filter).sort({ createdAt: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to load products" });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const p = await Product.findOne({ id: req.params.id });
    if (!p) return res.status(404).json({ message: "Not found" });
    res.json(p);
  } catch (err) {
    res.status(500).json({ message: "Failed to load product" });
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
    const { title, price, image, description, category } = req.body;
    if (!title || !price) return res.status(400).json({ message: "Missing fields" });

    const newProduct = await Product.create({
      title,
      price,
      category: category || "Men",
      image: image || "https://picsum.photos/600/400",
      description: description || "",
    });
    res.json(newProduct);
  } catch (err) {
    console.error("add product failed:", err.message);
    res.status(500).json({ message: "Failed to add product" });
  }
});

// Orders (now persisted)
app.post("/api/orders", authMiddleware, async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) return res.status(400).json({ message: "Invalid order" });
    const total = items.reduce((s, it) => s + (it.price || 0) * (it.qty || 1), 0);
    const order = await Order.create({ userId: req.user.id, items, total });
    res.json({ orderId: order.id, itemsCount: items.length, total });
  } catch (err) {
    console.error("order failed:", err.message);
    res.status(500).json({ message: "Failed to place order" });
  }
});

// ----------------------
// Start
// ----------------------
connectDB()
  .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
