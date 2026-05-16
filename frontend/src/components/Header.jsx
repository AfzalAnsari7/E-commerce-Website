import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import "./Header.css";

const OFFERS = [
  "FLAT 10% OFF ON YOUR FIRST ORDER — CODE: FIRST10",
  "FREE SHIPPING ON ORDERS ABOVE ₹999",
  "BUY 3 GET 1 FREE ON ALL T-SHIRTS",
];

const CATEGORIES = ["Men", "Women", "Sneakers"];

export default function Header() {
  const { cart } = useCart();
  const totalItems = cart.reduce((s, p) => s + p.qty, 0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  function onSearch(e) {
    e.preventDefault();
    navigate("/products");
  }

  return (
    <header className="ss-header">
      {/* Offer bar */}
      <div className="ss-offerbar">
        <div className="ss-offer-track">
          {[...OFFERS, ...OFFERS].map((o, i) => (
            <span className="ss-offer-item" key={i}>{o}</span>
          ))}
        </div>
      </div>

      {/* Main bar */}
      <div className="ss-main">
        <Link to="/" className="ss-logo">
          STREET<span>SOUL</span>
        </Link>

        <form className="ss-search" onSubmit={onSearch}>
          <svg className="ss-search-ic" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            aria-label="Search products"
            placeholder="Search for products, brands and more"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </form>

        <div className="ss-actions">
          {user ? (
            <div className="ss-action ss-account">
              <ActionIcon type="user" />
              <span className="ss-action-label">Hi, {user.name.split(" ")[0]}</span>
              <div className="ss-dropdown">
                {user.isAdmin && <Link to="/admin">Admin Panel</Link>}
                <button onClick={logout}>Logout</button>
              </div>
            </div>
          ) : (
            <Link to="/login" className="ss-action">
              <ActionIcon type="user" />
              <span className="ss-action-label">Account</span>
            </Link>
          )}

          <Link to="/products" className="ss-action ss-hide-sm">
            <ActionIcon type="heart" />
            <span className="ss-action-label">Wishlist</span>
          </Link>

          <Link to="/cart" className="ss-action ss-cart">
            <ActionIcon type="cart" />
            <span className="ss-action-label">Cart</span>
            {totalItems > 0 && <span className="ss-cart-badge">{totalItems}</span>}
          </Link>
        </div>
      </div>

      {/* Category nav */}
      <nav className="ss-catnav">
        {CATEGORIES.map((c) => (
          <NavLink
            key={c}
            to="/products"
            className={`ss-cat ${c === "Sale" ? "ss-cat-sale" : ""}`}
          >
            {c}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

function ActionIcon({ type }) {
  const common = {
    width: 22, height: 22, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.7,
    strokeLinecap: "round", strokeLinejoin: "round",
  };
  if (type === "user")
    return (
      <svg {...common}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  if (type === "heart")
    return (
      <svg {...common}>
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}
