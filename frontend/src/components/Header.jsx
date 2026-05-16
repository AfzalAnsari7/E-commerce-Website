import React, { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import "./Header.css";

const OFFERS = [
  "SUMMER SALE IS LIVE — UP TO 50% OFF",
  "FREE SHIPPING ON ORDERS ABOVE ₹999",
];

const CATEGORIES = ["Men", "Women", "Sneakers"];

export default function Header() {
  const { cart } = useCart();
  const totalItems = cart.reduce((s, p) => s + p.qty, 0);
  const { wishlist } = useWishlist();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  // lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  function onSearch(e) {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/products?q=${encodeURIComponent(term)}` : "/products");
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
        {/* Left: hamburger + nav links */}
        <div className="ss-left">
          <button
            className="ss-burger"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <span /><span /><span />
          </button>
          <nav className="ss-nav">
            {CATEGORIES.map((c) => (
              <NavLink
                key={c}
                to={`/products?category=${c}`}
                className="ss-nav-link"
              >
                {c}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Center: logo */}
        <Link to="/" className="ss-logo">
          STREET<span>SOUL</span>
        </Link>

        {/* Right: search + actions */}
        <div className="ss-right">
          <form className="ss-search" onSubmit={onSearch}>
            <input
              type="text"
              aria-label="Search products"
              placeholder="What are you looking for?"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="submit" className="ss-search-btn" aria-label="Search">
              <Icon type="search" />
            </button>
          </form>

          <div className="ss-actions">
            {user ? (
              <div className="ss-action ss-account">
                <Icon type="user" />
                <span className="ss-action-label">{user.name.split(" ")[0]}</span>
                <div className="ss-dropdown">
                  {user.isAdmin && <Link to="/admin">Admin Panel</Link>}
                  <Link to="/cart">My Cart</Link>
                  <button onClick={logout}>Logout</button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="ss-action">
                <Icon type="user" />
                <span className="ss-action-label">Account</span>
              </Link>
            )}

            <Link to="/wishlist" className="ss-action ss-hide-sm">
              <Icon type="heart" />
              <span className="ss-action-label">Wishlist</span>
              {wishlist.length > 0 && (
                <span className="ss-cart-badge">{wishlist.length}</span>
              )}
            </Link>

            <Link to="/cart" className="ss-action ss-cart">
              <Icon type="cart" />
              <span className="ss-action-label">Cart</span>
              {totalItems > 0 && <span className="ss-cart-badge">{totalItems}</span>}
            </Link>
          </div>
        </div>
      </div>

      {/* Slide-in drawer */}
      <div
        className={`ss-overlay ${menuOpen ? "show" : ""}`}
        onClick={() => setMenuOpen(false)}
      />
      <aside className={`ss-drawer ${menuOpen ? "open" : ""}`}>
        <div className="ss-drawer-head">
          <span className="ss-logo sm">STREET<span>SOUL</span></span>
          <button
            className="ss-drawer-close"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            ✕
          </button>
        </div>

        <nav className="ss-drawer-nav" onClick={() => setMenuOpen(false)}>
          <p className="ss-drawer-label">Shop</p>
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              to={`/products?category=${c}`}
              className="ss-drawer-link"
            >
              {c}
            </Link>
          ))}
          <Link to="/products" className="ss-drawer-link">All Products</Link>
          <Link to="/wishlist" className="ss-drawer-link">
            My Wishlist ({wishlist.length})
          </Link>

          <p className="ss-drawer-label">Account</p>
          {user ? (
            <>
              {user.isAdmin && <Link to="/admin" className="ss-drawer-link">Admin Panel</Link>}
              <Link to="/cart" className="ss-drawer-link">My Cart ({totalItems})</Link>
              <button
                className="ss-drawer-link ss-drawer-logout"
                onClick={logout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="ss-drawer-link">Login</Link>
              <Link to="/register" className="ss-drawer-link">Register</Link>
            </>
          )}
        </nav>
      </aside>
    </header>
  );
}

function Icon({ type }) {
  const c = {
    width: 21, height: 21, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.7,
    strokeLinecap: "round", strokeLinejoin: "round",
  };
  if (type === "search")
    return (
      <svg {...c}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    );
  if (type === "user")
    return (
      <svg {...c}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  if (type === "heart")
    return (
      <svg {...c}>
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
    );
  return (
    <svg {...c}>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}
