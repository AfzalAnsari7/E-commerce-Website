import React, { useEffect, useState, useCallback } from "react";
import api from "../services";
import ProductCard from "../components/ProductCard";
import { Link } from "react-router-dom";
import "./Home.styles.css";

const SLIDES = [
  {
    img: "https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=1920&q=80",
    top: "EXPLORE",
    title: "SUMMER '26",
    tags: "TEES | SHORTS | LINEN | SHADES",
  },
  {
    img: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1920&q=80",
    top: "NEW DROP",
    title: "OVERSIZED TEES",
    tags: "GRAPHIC | PLAIN | ANIME | PRINTS",
  },
  {
    img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1920&q=80",
    top: "JUST IN",
    title: "SNEAKERS",
    tags: "RUNNING | CASUAL | HIGH-TOPS",
  },
  {
    img: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1920&q=80",
    top: "BEACH READY",
    title: "SUMMER VIBES",
    tags: "TANKS | SHORTS | SUNGLASSES",
  },
];

const CATEGORIES = [
  { name: "Men", img: "https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=600" },
  { name: "Women", img: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600" },
  { name: "Sneakers", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600" },
];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    api
      .get("/api/products")
      .then((res) => setProducts(res.data))
      .catch(() => {});
  }, []);

  const go = useCallback(
    (dir) => setSlide((s) => (s + dir + SLIDES.length) % SLIDES.length),
    []
  );

  useEffect(() => {
    const t = setInterval(() => go(1), 5000);
    return () => clearInterval(t);
  }, [go]);

  return (
    <div className="ss-home">

      {/* ===== Hero banner carousel ===== */}
      <section className="ss-hero">
        <div
          className="ss-hero-track"
          style={{ transform: `translateX(-${slide * 100}%)` }}
        >
          {SLIDES.map((s, i) => (
            <Link
              to="/products"
              className="ss-hero-slide"
              key={i}
              style={{ backgroundImage: `url(${s.img})` }}
            >
              <div className="ss-hero-caption">
                <span className="ss-hero-top">{s.top}</span>
                <h1 className="ss-hero-title">{s.title}</h1>
                <p className="ss-hero-tags">{s.tags}</p>
              </div>
            </Link>
          ))}
        </div>

        <button
          className="ss-hero-arrow left"
          onClick={() => go(-1)}
          aria-label="Previous slide"
        >
          ‹
        </button>
        <button
          className="ss-hero-arrow right"
          onClick={() => go(1)}
          aria-label="Next slide"
        >
          ›
        </button>

        <div className="ss-hero-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={i === slide ? "on" : ""}
              onClick={() => setSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ===== Perks strip ===== */}
      <section className="ss-perks">
        <div className="ss-perk">
          <PerkIcon type="cashback" />
          <div>
            <strong>10% Cashback</strong>
            <span>on all App orders</span>
          </div>
        </div>
        <div className="ss-perk">
          <PerkIcon type="returns" />
          <div>
            <strong>30 days Easy Returns</strong>
            <span>&amp; Exchanges</span>
          </div>
        </div>
        <div className="ss-perk">
          <PerkIcon type="shipping" />
          <div>
            <strong>Free &amp; Fast Shipping</strong>
            <span>on all prepaid orders</span>
          </div>
        </div>
      </section>

      {/* ===== Category tiles ===== */}
      <section className="ss-section">
        <h2 className="ss-section-title">Shop By Category</h2>
        <div className="ss-cat-grid">
          {CATEGORIES.map((c) => (
            <Link
              to={`/products?category=${c.name}`}
              className="ss-cat-tile"
              key={c.name}
            >
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
            <h4>AXEN WEAR</h4>
            <p>Officially yours. Streetwear, pop-culture &amp; everyday essentials.</p>
          </div>
          <div>
            <h5>Shop</h5>
            <Link to="/products?category=Men">Men</Link>
            <Link to="/products?category=Women">Women</Link>
            <Link to="/products?category=Sneakers">Sneakers</Link>
            <Link to="/products">All Products</Link>
          </div>
          <div>
            <h5>Help</h5>
            <Link to="/page/contact">Contact Us</Link>
            <Link to="/page/shipping">Shipping</Link>
            <Link to="/page/returns">Returns &amp; Exchanges</Link>
            <Link to="/cart">My Bag</Link>
          </div>
          <div>
            <h5>Company</h5>
            <Link to="/page/about">About</Link>
            <Link to="/page/careers">Careers</Link>
            <Link to="/page/terms">Terms</Link>
            <Link to="/page/privacy">Privacy</Link>
          </div>
        </div>
        <p className="ss-footer-copy">
          © {new Date().getFullYear()} Axen Wear. All rights reserved.
        </p>
      </footer>

    </div>
  );
}

function PerkIcon({ type }) {
  const c = {
    width: 30, height: 30, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.6,
    strokeLinecap: "round", strokeLinejoin: "round",
  };
  if (type === "cashback")
    return (
      <svg {...c}>
        <circle cx="12" cy="12" r="9" />
        <path d="M14.5 9.5a2.5 2.5 0 0 0-2.5-1.5c-1.4 0-2.5.8-2.5 2s1.1 2 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2a2.5 2.5 0 0 1-2.5-1.5" />
        <path d="M12 6.5v11" />
      </svg>
    );
  if (type === "returns")
    return (
      <svg {...c}>
        <path d="M3 7l9-4 9 4-9 4-9-4z" />
        <path d="M3 7v10l9 4 9-4V7" />
        <path d="M3 7l9 4v10" />
      </svg>
    );
  return (
    <svg {...c}>
      <rect x="1" y="6" width="14" height="11" rx="1" />
      <path d="M15 9h4l3 3v5h-7z" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}
