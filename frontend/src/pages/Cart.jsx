import React from "react";
import { useCart } from "../context/CartContext";
import api from "../services";
import { useAuth } from "../context/AuthContext";
import "./Cart.styles.css";

export default function Cart() {
  const { cart, updateQty, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();

  const total = cart.reduce((s, p) => s + p.price * p.qty, 0);

  async function placeOrder() {
    if (!user) {
      return alert("You must be logged in to place an order");
    }
    try {
      const res = await api.post("/api/orders", { items: cart });
      alert("Order placed — id: " + res.data.orderId);
      clearCart();
    } catch (err) {
      alert("Order failed, try again");
    }
  }

  if (cart.length === 0)
    return <div className="empty-cart">Your cart is empty</div>;

  return (
    <div className="cart-container">
      <h2 className="cart-title">Your Cart</h2>

      <div className="cart-list">
        {cart.map((p) => (
          <div className="cart-item" key={p.id}>
            <div className="item-details">
              <h4>{p.title}</h4>
              <p className="price">₹{p.price}</p>
            </div>

            <input
              type="number"
              min="1"
              value={p.qty}
              className="qty-input"
              onChange={(e) =>
                updateQty(p.id, parseInt(e.target.value || 1))
              }
            />

            <p className="item-total">₹{p.price * p.qty}</p>

            <button className="remove-btn" onClick={() => removeFromCart(p.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="cart-footer">
        <h3>Total: ₹{total}</h3>

        <div>
          <button className="clear-btn" onClick={clearCart}>
            Clear Cart
          </button>
          <button className="order-btn" onClick={placeOrder}>
            Place Order
          </button>
        </div>
      </div>
    </div>
  );
}
