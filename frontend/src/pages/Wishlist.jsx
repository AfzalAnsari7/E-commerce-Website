import React from "react";
import { Link } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import "./Wishlist.styles.css";

export default function Wishlist() {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  if (wishlist.length === 0) {
    return (
      <div className="wl-empty">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
        <h2>Your wishlist is empty</h2>
        <p>Tap the heart on any product to save it here.</p>
        <Link to="/products" className="wl-shop-btn">Browse Products</Link>
      </div>
    );
  }

  return (
    <div className="wl-page">
      <div className="wl-head">
        <h1 className="wl-title">My Wishlist</h1>
        <span className="wl-count">{wishlist.length} saved</span>
      </div>

      <div className="wl-grid">
        {wishlist.map((p) => (
          <div className="wl-card" key={p.id}>
            <button
              className="wl-remove"
              aria-label="Remove from wishlist"
              onClick={() => removeFromWishlist(p.id)}
            >
              ✕
            </button>
            <Link to={`/products/${p.id}`} className="wl-img">
              <img src={p.image} alt={p.title} />
            </Link>
            <div className="wl-body">
              <Link to={`/products/${p.id}`} className="wl-name">{p.title}</Link>
              <p className="wl-price">₹{p.price}</p>
              <button
                className="wl-move"
                onClick={() => {
                  addToCart(p, 1);
                  removeFromWishlist(p.id);
                }}
              >
                Move to Bag
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
