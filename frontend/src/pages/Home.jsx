import React, { useEffect, useState } from "react";
import api from "../services";
import ProductCard from "../components/ProductCard";
import Hero3D from "../components/Hero3D";
import { Link } from "react-router-dom";
import "./Home.styles.css";

const CATEGORIES = [
  { name: "Oversized T-Shirts", img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600" },
  { name: "Hoodies", img: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600" },
  { name: "Joggers", img: "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=600" },
  { name: "Shirts", img: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600" },
  { name: "Accessories", img: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600" },
];

export default function Home() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api
      .get("/api/products")
      .then((res) => setProducts(res.data))
      .catch(() => {});
  }, []);

  return (
    <div className="ss-home">

      {/* ===== 3D Hero (three.js) ===== */}
      <section className="ss-hero3d">
        <div className="ss-hero3d-bg">
          <Hero3D />
        </div>
        <div className="ss-slide-content">
          <p className="ss-slide-eyebrow">New Drop · Interactive 3D</p>
          <h1 className="ss-slide-title">Wear The Future</h1>
          <p className="ss-slide-sub">
            Streetwear, reimagined. Move your cursor — the collection moves with you.
          </p>
          <Link to="/products" className="ss-cta">Shop Now</Link>
        </div>
        <div className="ss-hero3d-hint">Move your mouse to interact ✦</div>
      </section>

      {/* ===== Perks strip ===== */}
      <section className="ss-perks">
        <div><strong>FREE SHIPPING</strong><span>On orders above ₹999</span></div>
        <div><strong>EASY RETURNS</strong><span>15-day return policy</span></div>
        <div><strong>SECURE PAYMENTS</strong><span>100% protected checkout</span></div>
        <div><strong>OFFICIAL MERCH</strong><span>Authentic licensed designs</span></div>
      </section>

      {/* ===== Category tiles ===== */}
      <section className="ss-section">
        <h2 className="ss-section-title">Shop By Category</h2>
        <div className="ss-cat-grid">
          {CATEGORIES.map((c) => (
            <Link to="/products" className="ss-cat-tile" key={c.name}>
              <div className="ss-cat-img" style={{ backgroundImage: `url(${c.img})` }} />
              <span>{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Bestsellers ===== */}
      <section className="ss-section">
        <div className="ss-section-head">
          <h2 className="ss-section-title">Bestsellers</h2>
          <Link to="/products" className="ss-viewall">View All →</Link>
        </div>
        <div className="ss-product-grid">
          {products.slice(0, 8).map((p) => (
            <ProductCard product={p} key={p.id} />
          ))}
        </div>
      </section>

      {/* ===== Promo banner ===== */}
      <section className="ss-promo">
        <div className="ss-promo-inner">
          <h2>FLAT 40% OFF</h2>
          <p>On your second order. No minimum. Limited time only.</p>
          <Link to="/products" className="ss-cta ss-cta-light">Grab the Deal</Link>
        </div>
      </section>

      {/* ===== New arrivals ===== */}
      {products.length > 8 && (
        <section className="ss-section">
          <div className="ss-section-head">
            <h2 className="ss-section-title">New Arrivals</h2>
            <Link to="/products" className="ss-viewall">View All →</Link>
          </div>
          <div className="ss-product-grid">
            {products.slice(8, 16).map((p) => (
              <ProductCard product={p} key={p.id} />
            ))}
          </div>
        </section>
      )}

      {/* ===== Footer ===== */}
      <footer className="ss-footer">
        <div className="ss-footer-cols">
          <div>
            <h4>STREETSOUL</h4>
            <p>Officially yours. Streetwear, pop-culture &amp; everyday essentials.</p>
          </div>
          <div>
            <h5>Shop</h5>
            <a href="#">Men</a><a href="#">Women</a><a href="#">New Arrivals</a><a href="#">Sale</a>
          </div>
          <div>
            <h5>Help</h5>
            <a href="#">Track Order</a><a href="#">Returns</a><a href="#">Shipping</a><a href="#">Contact</a>
          </div>
          <div>
            <h5>Company</h5>
            <a href="#">About</a><a href="#">Careers</a><a href="#">Terms</a><a href="#">Privacy</a>
          </div>
        </div>
        <p className="ss-footer-copy">
          © {new Date().getFullYear()} STREETSOUL. All rights reserved.
        </p>
      </footer>

    </div>
  );
}
