import React from "react";
import { useCart } from "../context/CartContext";
import api from "../services";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import "./Cart.styles.css";

const FREE_SHIP_OVER = 999;
const SHIP_FEE = 49;

export default function Cart() {
  const { cart, updateQty, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const subtotal = cart.reduce((s, p) => s + p.price * p.qty, 0);
  const itemCount = cart.reduce((s, p) => s + p.qty, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIP_OVER ? 0 : SHIP_FEE;
  const total = subtotal + shipping;

  async function placeOrder() {
    if (!user) {
      alert("Please log in to place an order");
      return navigate("/login");
    }
    try {
      const res = await api.post("/api/orders", { items: cart });
      alert("Order placed — id: " + res.data.orderId);
      clearCart();
    } catch (err) {
      alert("Order failed, try again");
    }
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
          {cart.map((p) => (
            <div className="cart-item" key={p.id}>
              <Link to={`/products/${p.id}`} className="cart-thumb">
                <img src={p.image} alt={p.title} />
              </Link>

              <div className="cart-info">
                <Link to={`/products/${p.id}`} className="cart-name">
                  {p.title}
                </Link>
                <p className="cart-unit">₹{p.price}</p>

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

              <div className="cart-line-total">₹{p.price * p.qty}</div>
            </div>
          ))}

          <button className="cart-clear" onClick={clearCart}>
            Clear entire bag
          </button>
        </div>

        {/* Summary */}
        <aside className="cart-summary">
          <h3>Order Summary</h3>

          <div className="sum-row">
            <span>Subtotal ({itemCount} items)</span>
            <span>₹{subtotal}</span>
          </div>
          <div className="sum-row">
            <span>Shipping</span>
            <span>
              {shipping === 0
                ? <em className="free">FREE</em>
                : `₹${shipping}`}
            </span>
          </div>
          {shipping > 0 && (
            <p className="sum-hint">
              Add ₹{FREE_SHIP_OVER - subtotal} more for free shipping
            </p>
          )}

          <div className="sum-row sum-total">
            <span>Total</span>
            <span>₹{total}</span>
          </div>

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
