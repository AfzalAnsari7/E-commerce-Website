/* One-off catalog seeder.
   Run from the server folder:  node scripts/seedCatalog.js
   Removes the old placeholder products and inserts a realistic
   set across Men / Women / Sneakers. Safe to re-run (it clears
   the demo set first, then re-inserts). */
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/Product");

const img = (id) =>
  `https://images.unsplash.com/photo-${id}?w=700&q=80&auto=format&fit=crop`;

const CATALOG = [
  // ---------- MEN ----------
  { title: "Classic Cotton Crew Tee", price: 799, mrp: 1299, category: "Men", image: img("1521572163474-6864f9cf17ab"), description: "Soft 100% cotton crew-neck tee with a relaxed everyday fit." },
  { title: "Oversized Graphic T-Shirt", price: 999, mrp: 1599, category: "Men", image: img("1503341504253-dff4815485f1"), description: "Drop-shoulder oversized tee with a bold front print." },
  { title: "Denim Trucker Jacket", price: 3499, mrp: 5999, category: "Men", image: img("1551537482-f2075a1d41f2"), description: "Rugged washed-denim jacket with classic button front." },
  { title: "Pullover Hoodie", price: 1899, mrp: 2999, category: "Men", image: img("1556821840-3a63f95609a7"), description: "Heavyweight fleece hoodie with kangaroo pocket." },
  { title: "Slim-Fit Casual Shirt", price: 1499, mrp: 2499, category: "Men", image: img("1602810318383-e386cc2a3ccf"), description: "Breathable cotton shirt for work or weekends." },
  { title: "Jogger Sweatpants", price: 1299, mrp: 1999, category: "Men", image: img("1552902865-b72c031ac5ea"), description: "Tapered joggers with elastic cuffs and side pockets." },

  // ---------- WOMEN ----------
  { title: "Floral Summer Dress", price: 2199, mrp: 3499, category: "Women", image: img("1595777457583-95e059d581b8"), description: "Lightweight floral dress, perfect for warm days." },
  { title: "Ribbed Crop Top", price: 699, mrp: 1199, category: "Women", image: img("1564257631407-4deb1f99d992"), description: "Stretchy ribbed crop top in a flattering fit." },
  { title: "High-Waist Mom Jeans", price: 2499, mrp: 3999, category: "Women", image: img("1542272604-787c3835535d"), description: "Vintage-inspired high-waist denim with a relaxed leg." },
  { title: "Linen Blend Blouse", price: 1599, mrp: 2599, category: "Women", image: img("1485462537746-965f33f7f6a7"), description: "Airy linen-blend blouse with a soft drape." },
  { title: "Pleated Midi Skirt", price: 1799, mrp: 2799, category: "Women", image: img("1583496661160-fb5886a13d77"), description: "Flowy pleated midi skirt that moves with you." },
  { title: "Knit Co-ord Set", price: 2899, mrp: 4499, category: "Women", image: img("1490481651871-ab68de25d43d"), description: "Matching knit top and bottoms for an easy look." },

  // ---------- SNEAKERS ----------
  { title: "Everyday White Sneakers", price: 2999, mrp: 4999, category: "Sneakers", image: img("1542291026-7eec264c27ff"), description: "Minimal white leather sneakers that go with everything." },
  { title: "Performance Runners", price: 3999, mrp: 6499, category: "Sneakers", image: img("1595950653106-6c9ebd614d3a"), description: "Cushioned running shoes built for daily miles." },
  { title: "Retro High-Tops", price: 3499, mrp: 5499, category: "Sneakers", image: img("1600185365926-3a2ce3cdb9eb"), description: "Street-ready high-top sneakers with a retro vibe." },
  { title: "Canvas Casual Shoes", price: 1799, mrp: 2799, category: "Sneakers", image: img("1525966222134-fcfa99b8ae77"), description: "Lightweight canvas sneakers for laid-back days." },
  { title: "Chunky Dad Sneakers", price: 4499, mrp: 6999, category: "Sneakers", image: img("1606107557195-0e29a4b5b4aa"), description: "Bold chunky-sole sneakers that make a statement." },
  { title: "Slip-On Trainers", price: 2299, mrp: 3499, category: "Sneakers", image: img("1539185441755-769473a23570"), description: "Easy slip-on trainers with a flexible sole." },
];

(async () => {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/eshop";
  await mongoose.connect(uri);

  // remove the old picsum placeholder seed + any previous demo run
  await Product.deleteMany({
    $or: [
      { id: { $in: ["p1", "p2", "p3", "p4", "p5", "p6", "TTNCfyBv"] } },
      { title: { $in: CATALOG.map((c) => c.title) } },
    ],
  });

  await Product.insertMany(CATALOG);

  const counts = {};
  for (const c of ["Men", "Women", "Sneakers"]) {
    counts[c] = await Product.countDocuments({ category: c });
  }
  console.log("Catalog seeded. Totals by category:", counts);
  console.log("Total products:", await Product.countDocuments());
  process.exit(0);
})();
