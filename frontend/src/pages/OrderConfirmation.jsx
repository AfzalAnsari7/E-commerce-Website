import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services";
import "./OrderConfirmation.styles.css";

const FREE_SHIP_OVER = 999;
const SHIP_FEE = 49;
const FALLBACK_IMG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='90' height='110'><rect width='100%25' height='100%25' fill='%23eee'/><text x='50%25' y='50%25' font-size='10' fill='%23999' text-anchor='middle' dy='.3em'>No image</text></svg>";

export default function OrderConfirmation() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get(`/api/orders/${id}`)
      .then((res) => setOrder(res.data))
      .catch((e) => setErr(e.response?.data?.message || "Could not load order"));
  }, [id]);

  if (err) {
    return (
      <div className="oc-msg">
        <h2>{err}</h2>
        <Link to="/products" className="oc-btn">Continue Shopping</Link>
      </div>
    );
  }
  if (!order) return <div className="oc-msg">Loading order…</div>;

  const items = order.items || [];
  const subtotal = items.reduce((s, p) => s + p.price * p.qty, 0);
  const bagMrp = items.reduce(
    (s, p) => s + (Number(p.mrp) > p.price ? p.mrp : p.price) * p.qty, 0
  );
  const discount = bagMrp - subtotal;
  const shipping = subtotal >= FREE_SHIP_OVER ? 0 : SHIP_FEE;
  const total = subtotal + shipping;
  const placed = new Date(order.createdAt);

  return (
    <div className="oc-page">
      {/* Success banner */}
      <div className="oc-success">
        <div className="oc-check">✓</div>
        <h1>Order Confirmed!</h1>
        <p>Thank you for shopping with Axen Wear. A confirmation has been recorded.</p>
      </div>

      {/* Invoice */}
      <div className="oc-invoice">
        <div className="oc-invoice-head">
          <div>
            <h2>Tax Invoice</h2>
            <span className="oc-brand">AXEN WEAR</span>
          </div>
          <div className="oc-meta">
            <p><span>Order ID</span><strong>{order.id}</strong></p>
            <p><span>Date</span><strong>{placed.toLocaleString()}</strong></p>
            <p><span>Status</span><strong className="oc-status">{order.status}</strong></p>
          </div>
        </div>

        <div className="oc-table">
          <div className="oc-trow oc-thead">
            <span>Product</span>
            <span>Size</span>
            <span>Qty</span>
            <span>Price</span>
            <span>Amount</span>
          </div>
          {items.map((p, i) => (
            <div className="oc-trow" key={i}>
              <span className="oc-prod">
                <img
                  src={p.image}
                  alt=""
                  onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
                />
                <span>
                  <strong>{p.title}</strong>
                  {p.category && <em>{p.category}</em>}
                </span>
              </span>
              <span data-l="Size">{p.size || "Free"}</span>
              <span data-l="Qty">{p.qty}</span>
              <span data-l="Price">₹{p.price}</span>
              <span data-l="Amount">₹{p.price * p.qty}</span>
            </div>
          ))}
        </div>

        <div className="oc-totals">
          <div className="oc-trow2"><span>Bag total</span><span>₹{bagMrp}</span></div>
          {discount > 0 && (
            <div className="oc-trow2"><span>Discount</span><span className="oc-green">− ₹{discount}</span></div>
          )}
          <div className="oc-trow2">
            <span>Delivery</span>
            <span>{shipping === 0 ? <em className="oc-free">FREE</em> : `₹${shipping}`}</span>
          </div>
          <div className="oc-trow2 oc-grand">
            <span>Total Paid</span><span>₹{total}</span>
          </div>
          {discount > 0 && (
            <p className="oc-saved">You saved ₹{discount} on this order 🎉</p>
          )}
        </div>
      </div>

      <div className="oc-actions">
        <button className="oc-btn" onClick={() => window.print()}>
          Print / Download Invoice
        </button>
        <Link to="/products" className="oc-btn oc-btn-light">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
