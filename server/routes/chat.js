// server/routes/chat.js
// Multi-provider AI shopping assistant. API keys live only on the backend.
// Enable a provider by setting its API key env var; models from providers
// without a key are automatically hidden from the UI.
const express = require("express");
const rateLimit = require("express-rate-limit");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const Product = require("../models/Product");

const router = express.Router();

// ---- Providers (configured = has an API key in the environment) ----
const PROVIDERS = {
  gemini: { key: process.env.GEMINI_API_KEY },
  openai: { key: process.env.OPENAI_API_KEY, baseURL: "https://api.openai.com/v1" },
  groq: { key: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" },
};

// ---- Model catalog the UI can choose from ----
// `free: true` is just a UI hint. Override the default Gemini model with GEMINI_MODEL.
const MODELS = [
  { id: process.env.GEMINI_MODEL || "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini", free: true },
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (Groq)", provider: "groq", free: true },
  { id: "gpt-4o-mini", label: "ChatGPT (GPT-4o mini)", provider: "openai", free: false },
];

const isConfigured = (provider) => Boolean(PROVIDERS[provider] && PROVIDERS[provider].key);
const availableModels = () => MODELS.filter((m) => isConfigured(m.provider));

const genAI = PROVIDERS.gemini.key ? new GoogleGenerativeAI(PROVIDERS.gemini.key) : null;

if (availableModels().length === 0) {
  console.warn("WARNING: no AI provider key set — /api/chat will return 503. Set GEMINI_API_KEY (free).");
}

// Free tiers are rate-limited — protect the endpoint and our quota.
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
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

// Compact catalog, cached 5 min so we don't hit MongoDB on every message.
let catalogCache = { text: "", at: 0 };
async function getCatalog() {
  const FIVE_MIN = 5 * 60 * 1000;
  if (catalogCache.text && Date.now() - catalogCache.at < FIVE_MIN) return catalogCache.text;
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

// ---- Provider callers ----
async function callGemini(modelId, systemInstruction, history, message) {
  const model = genAI.getGenerativeModel({ model: modelId, systemInstruction });
  const chat = model.startChat({
    history: history.map((h) => ({
      role: h.role === "model" ? "model" : "user",
      parts: [{ text: String(h.text || "") }],
    })),
  });
  const result = await chat.sendMessage(message);
  return result.response.text();
}

// OpenAI + Groq share the OpenAI-compatible chat-completions API.
async function callOpenAICompatible(provider, modelId, systemInstruction, history, message) {
  const messages = [
    { role: "system", content: systemInstruction },
    ...history.map((h) => ({ role: h.role === "model" ? "assistant" : "user", content: String(h.text || "") })),
    { role: "user", content: message },
  ];
  const resp = await fetch(`${PROVIDERS[provider].baseURL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${PROVIDERS[provider].key}` },
    body: JSON.stringify({ model: modelId, messages, max_tokens: 1024 }),
  });
  if (!resp.ok) throw new Error(`${provider} ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "(no response)";
}

// ---- Routes ----

// List models the frontend dropdown can offer (only configured providers).
router.get("/models", (_req, res) => {
  res.json({
    models: availableModels().map(({ id, label, provider, free }) => ({ id, label, provider, free })),
  });
});

router.post("/", chatLimiter, async (req, res) => {
  try {
    const available = availableModels();
    if (available.length === 0) {
      return res.status(503).json({ error: "AI assistant is not configured." });
    }

    const { message, history = [], model: requestedModel } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required." });
    }

    // Pick the requested model if it's available, else default to the first available.
    const chosen = available.find((m) => m.id === requestedModel) || available[0];

    const catalog = await getCatalog();
    const systemInstruction = `${BASE_PROMPT}\n\n=== PRODUCT CATALOG ===\n${catalog || "(catalog is empty)"}`;
    const safeHistory = (Array.isArray(history) ? history : []).slice(-10);
    const userMessage = message.slice(0, 2000);

    let reply;
    if (chosen.provider === "gemini") {
      reply = await callGemini(chosen.id, systemInstruction, safeHistory, userMessage);
    } else {
      reply = await callOpenAICompatible(chosen.provider, chosen.id, systemInstruction, safeHistory, userMessage);
    }

    res.json({ reply, model: chosen.id });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

module.exports = router;
