import React from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import "./Cart.styles.css";

const FREE_SHIP_OVER = 999;
const SHIP_FEE = 49;
const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL"];
const FALLBACK_IMG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='150'><rect width='100%25' height='100%25' fill='%23eee'/><text x='50%25' y='50%25' font-size='12' fill='%23999' text-anchor='middle' dy='.3em'>No image</text></svg>";

export default function Cart() {
  const { cart, updateQty, updateSize, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const subtotal = cart.reduce((s, p) => s + p.price * p.qty, 0);
  const bagMrp = cart.reduce((s, p) => s + (Number(p.mrp) > p.price ? p.mrp : p.price) * p.qty, 0);
  const discount = bagMrp - subtotal;
  const itemCount = cart.reduce((s, p) => s + p.qty, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIP_OVER ? 0 : SHIP_FEE;
  const total = subtotal + shipping;

  function placeOrder() {
    if (!user) {
      alert("Please log in to place an order");
      return navigate("/login");
    }
    navigate("/checkout");
  }

  if (cart.length === 0) {
    return (
      <div className="cart-empty">
        <svg width="58" height="58" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"
          strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        <h2>Your cart is empty</h2>
        <p>Looks like you haven’t added anything yet.</p>
        <Link to="/products" className="cart-shop-btn">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-head">
        <h1 className="cart-title">Shopping Bag</h1>
        <span className="cart-count">{itemCount} item{itemCount > 1 ? "s" : ""}</span>
      </div>

      <div className="cart-grid">
        {/* Items */}
        <div className="cart-items">
          {cart.map((p) => {
            const lineMrp = (Number(p.mrp) > p.price ? p.mrp : p.price) * p.qty;
            const lineNow = p.price * p.qty;
            return (
              <div className="cart-item" key={`${p.id}-${p.size || ""}`}>
                <Link to={`/products/${p.id}`} className="cart-thumb">
                  <img
                    src={p.image}
                    alt=""
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
                  />
                </Link>

                <div className="cart-info">
                  <Link to={`/products/${p.id}`} className="cart-name">
                    {p.title}
                  </Link>

                  <div className="cart-meta">
                    <label className="cart-size">
                      Size:
                      <select
                        value={p.size || ""}
                        onChange={(e) => updateSize(p.id, e.target.value)}
                      >
                        {DEFAULT_SIZES.map((s) => {
                          const avail =
                            !Array.isArray(p.sizes) ||
                            !p.sizes.length ||
                            p.sizes.includes(s);
                          return (
                            <option key={s} value={s} disabled={!avail}>
                              {s}{avail ? "" : " (out of stock)"}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                    {p.category && <span>Category: <strong>{p.category}</strong></span>}
                    <span>Qty: <strong>{p.qty}</strong></span>
                  </div>

                  <div className="cart-unit">
                    <span className="cart-now">₹{p.price}</span>
                    {Number(p.mrp) > p.price && (
                      <>
                        <span className="cart-was">₹{p.mrp}</span>
                        <span className="cart-save">
                          {Math.round(((p.mrp - p.price) / p.mrp) * 100)}% off
                        </span>
                      </>
                    )}
                  </div>

                  <div className="cart-controls">
                    <div className="qty-stepper">
                      <button
                        onClick={() => updateQty(p.id, Math.max(1, p.qty - 1))}
                        aria-label="Decrease quantity"
                      >−</button>
                      <span>{p.qty}</span>
                      <button
                        onClick={() => updateQty(p.id, p.qty + 1)}
                        aria-label="Increase quantity"
                      >+</button>
                    </div>
                    <button
                      className="cart-remove"
                      onClick={() => removeFromCart(p.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="cart-line-total">
                  ₹{lineNow}
                  {lineMrp > lineNow && <small>₹{lineMrp}</small>}
                </div>
              </div>
            );
          })}

          <button className="cart-clear" onClick={clearCart}>
            Clear entire bag
          </button>
        </div>

        {/* Price details (invoice style) */}
        <aside className="cart-summary">
          <h3>Price Details</h3>

          <div className="sum-row">
            <span>Bag total ({itemCount} item{itemCount > 1 ? "s" : ""})</span>
            <span>₹{bagMrp}</span>
          </div>
          {discount > 0 && (
            <div className="sum-row">
              <span>Discount</span>
              <span className="sum-green">− ₹{discount}</span>
            </div>
          )}
          <div className="sum-row">
            <span>Delivery</span>
            <span>
              {shipping === 0 ? <em className="free">FREE</em> : `₹${shipping}`}
            </span>
          </div>
          {shipping > 0 && (
            <p className="sum-hint">
              Add ₹{FREE_SHIP_OVER - subtotal} more for free delivery
            </p>
          )}

          <div className="sum-row sum-total">
            <span>Total Amount</span>
            <span>₹{total}</span>
          </div>

          {discount > 0 && (
            <p className="sum-saved">You will save ₹{discount} on this order</p>
          )}

          <button className="cart-checkout" onClick={placeOrder}>
            Place Order
          </button>
          <Link to="/products" className="cart-continue">
            ← Continue Shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
