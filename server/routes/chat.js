// server/routes/chat.js
// AI shopping assistant powered by Google Gemini (free tier).
// The API key lives only here on the backend — never exposed to the browser.
const express = require("express");
const rateLimit = require("express-rate-limit");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const Product = require("../models/Product");

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn("WARNING: GEMINI_API_KEY not set — /api/chat will return 503.");
}
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Free tiers are rate-limited — protect the endpoint and our quota.
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests/min per IP
  message: { error: "Too many requests, please slow down." },
});

const BASE_PROMPT = `You are a friendly shopping assistant for our online store.
Help customers find products, compare options, and answer questions about shipping,
returns, and orders. Be concise and warm.

Rules:
- Recommend ONLY products from the catalog provided below. Never invent products,
  prices, or links.
- When suggesting a product, mention its title and price.
- For anything about a specific user's order or account, say you can't see personal
  account data and suggest they check "My Orders" or contact support.
- If nothing in the catalog matches, say so honestly.`;

// Build a compact catalog string the model can reason over.
// Cached in memory for 5 min so we don't hit MongoDB on every message.
let catalogCache = { text: "", at: 0 };
async function getCatalog() {
  const FIVE_MIN = 5 * 60 * 1000;
  if (catalogCache.text && Date.now() - catalogCache.at < FIVE_MIN) {
    return catalogCache.text;
  }
  const products = await Product.find({})
    .select("title price mrp category sizes description")
    .limit(100)
    .lean();

  const text = products
    .map((p) => {
      const sizes = (p.sizes || []).join("/");
      const desc = (p.description || "").slice(0, 120);
      return `- ${p.title} | ₹${p.price}${p.mrp ? ` (MRP ₹${p.mrp})` : ""} | ${p.category} | sizes: ${sizes} | ${desc}`;
    })
    .join("\n");

  catalogCache = { text, at: Date.now() };
  return text;
}

router.post("/", chatLimiter, async (req, res) => {
  try {
    if (!genAI) {
      return res.status(503).json({ error: "AI assistant is not configured." });
    }

    const { message, history = [] } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required." });
    }

    const catalog = await getCatalog();
    const systemInstruction = `${BASE_PROMPT}\n\n=== PRODUCT CATALOG ===\n${catalog || "(catalog is empty)"}`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction,
    });

    // history: [{ role: "user" | "model", text: "..." }]
    const safeHistory = Array.isArray(history) ? history.slice(-10) : [];
    const chat = model.startChat({
      history: safeHistory.map((h) => ({
        role: h.role === "model" ? "model" : "user",
        parts: [{ text: String(h.text || "") }],
      })),
    });

    const result = await chat.sendMessage(message.slice(0, 2000));
    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

module.exports = router;
