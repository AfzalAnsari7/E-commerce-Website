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
    let alive = true;
    const fetchOrder = () =>
      api.get(`/api/orders/${id}`)
        .then((res) => { if (alive) setOrder(res.data); })
        .catch((e) => {
          if (alive) setErr(e.response?.data?.message || "Could not load order");
        });
    fetchOrder();
    // keep the tracking status fresh while the page is open
    const t = setInterval(fetchOrder, 30000);
    return () => { alive = false; clearInterval(t); };
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
        <h1>{order.status === "delivered" ? "Delivered!" : "Order Confirmed!"}</h1>
        <p>
          Thank you for shopping with Axen Wear.{" "}
          {order.status !== "delivered" && order.expectedDelivery && (
            <>Arriving by{" "}
              <strong>
                {new Date(order.expectedDelivery).toLocaleDateString(undefined, {
                  weekday: "short", day: "numeric", month: "long",
                })}
              </strong>
            </>
          )}
        </p>
      </div>

      {/* Track Order */}
      {Array.isArray(order.tracking) && order.tracking.length > 0 && (
        <div className="oc-track">
          <h2>
            Track Order
            <span className="oc-live">● Live · auto-updates</span>
          </h2>
          <div className="oc-steps">
            {order.tracking.map((s, i) => (
              <div
                key={s.key}
                className={`oc-step ${s.done ? "done" : ""} ${
                  order.status === s.key ? "current" : ""
                }`}
              >
                <span className="oc-dot">{s.done ? "✓" : i + 1}</span>
                <div className="oc-step-txt">
                  <strong>{s.label}</strong>
                  <em>
                    {new Date(s.at).toLocaleString(undefined, {
                      day: "numeric", month: "short",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </em>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery + Payment */}
      <div className="oc-cols">
        {order.address && (
          <div className="oc-box">
            <h3>Delivery Address</h3>
            <p className="oc-addr-name">
              {order.address.fullName}{" "}
              <span className="oc-addr-type">{order.address.type}</span>
            </p>
            <p>
              {order.address.line1}
              {order.address.line2 ? `, ${order.address.line2}` : ""}
              {order.address.landmark ? `, near ${order.address.landmark}` : ""}
              <br />
              {order.address.city}, {order.address.state} - {order.address.pincode}
            </p>
            <p className="oc-addr-phone">📞 {order.address.phone}</p>
          </div>
        )}

        <div className="oc-box">
          <h3>Delivery Partner</h3>
          {order.deliveryPartner?.name ? (
            <>
              <p className="oc-addr-name">{order.deliveryPartner.name}</p>
              <p>Tracking ID: <strong>{order.deliveryPartner.trackingId}</strong></p>
              <a
                className="oc-call"
                href={`tel:${order.deliveryPartner.phone.replace(/\s/g, "")}`}
              >
                📞 Call {order.deliveryPartner.phone}
              </a>
            </>
          ) : (
            <p>Being assigned…</p>
          )}
          <p className="oc-pay">
            Payment:{" "}
            <strong>
              {order.paymentStatus === "paid"
                ? "Paid online ✓"
                : order.paymentStatus === "pending"
                ? "Payment pending"
                : order.paymentStatus === "failed"
                ? "Payment failed"
                : "Cash on Delivery"}
            </strong>
          </p>
        </div>
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
