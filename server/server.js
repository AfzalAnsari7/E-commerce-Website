// server.js
require('dotenv').config();
const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";

// JSON files
const productsFile = path.join(__dirname, "data", "products.json");
const usersFile = path.join(__dirname, "data", "users.json");

app.use(cors());
app.use(express.json());

// Helper functions
function readJSON(file) {
  return JSON.parse(fs.readFileSync(file));
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ----------------------
// OTP SYSTEM
// ----------------------
const otpStore = {}; // { email: { otp, expiresAt, attempts, lockedUntil } }

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function htmlOtpTemplate(name, otp) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2 style="color:#2b6cb0">E-Shop — Verify your email</h2>
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
    console.log("Ethereal account:", testAccount); // for previewing credentials
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  } else {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER || "yourgmail@gmail.com",
        pass: process.env.SMTP_PASS || "yourapppassword",
      },
    });
  }
}

// ----------------------
// AUTH + OTP ROUTES
// ----------------------

// Step 1: Request OTP
app.post("/api/auth/request-otp", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "Missing fields" });

  // Check if email already exists
  const users = readJSON(usersFile);
  if (users.find(u => u.email === email))
    return res.status(400).json({ message: "Email already exists" });

  const otp = generateOtp();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore[email] = { otp, expiresAt, attempts: 0 };

  const transporter = await createTransporter();
  const info = await transporter.sendMail({
    from: '"E-Shop" <no-reply@eshop.com>',
    to: email,
    subject: "Verify your email",
    html: htmlOtpTemplate(name, otp)
  });

  // For Ethereal testing only
  const preview = nodemailer.getTestMessageUrl(info);

  res.json({ message: "OTP sent", preview });
});

// Step 2: Verify OTP
app.post("/api/auth/verify-otp", (req, res) => {
  const { email, otp, name, password } = req.body;
  if (!email || !otp) return res.status(400).json({ message: "Missing fields" });

  const record = otpStore[email];
  if (!record) return res.status(400).json({ message: "No OTP requested" });
  if (Date.now() > record.expiresAt) return res.status(400).json({ message: "OTP expired" });
  if (record.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

  // OTP correct — create user
  const users = readJSON(usersFile);
  const hashed = bcrypt.hashSync(password, 8);
  const newUser = { id: nanoid(8), name, email, password: hashed, isAdmin: false };
  users.push(newUser);
  writeJSON(usersFile, users);

  delete otpStore[email]; // clear OTP

  const token = jwt.sign({ id: newUser.id, email: newUser.email, isAdmin: newUser.isAdmin }, JWT_SECRET, { expiresIn: "7d" });
  res.json({
    message: "OTP verified, registration successful",
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email, isAdmin: newUser.isAdmin }
  });
});

// ----------------------
// LOGIN
// ----------------------
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Missing fields" });

  const users = readJSON(usersFile);
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, email: user.email, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
});

// ----------------------
// PRODUCTS
// ----------------------
app.get("/api/products", (req, res) => {
  const products = readJSON(productsFile);
  res.json(products);
});

app.get("/api/products/:id", (req, res) => {
  const products = readJSON(productsFile);
  const p = products.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ message: "Not found" });
  res.json(p);
});

// ----------------------
// ADMIN PROTECTED
// ----------------------
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "Unauthorized" });
  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

app.post("/api/admin/products", authMiddleware, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: "Forbidden" });
  const { title, price, image, description } = req.body;
  if (!title || !price) return res.status(400).json({ message: "Missing fields" });

  const products = readJSON(productsFile);
  const newProduct = { id: nanoid(8), title, price, image: image || "https://picsum.photos/600/400", description: description || "" };
  products.push(newProduct);
  writeJSON(productsFile, products);
  res.json(newProduct);
});

// ----------------------
// ORDERS
// ----------------------
app.post("/api/orders", authMiddleware, (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) return res.status(400).json({ message: "Invalid order" });
  const orderId = nanoid(10);
  res.json({ orderId, itemsCount: items.length });
});

// ----------------------
app.listen(PORT, () => console.log("Server running on", PORT));
