import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services";
import { useAuth } from "../context/AuthContext";
import "./Account.styles.css";

const STATUS_COLOR = {
  placed: "#7a8273", packed: "#7c8c68", shipped: "#5a7d8c",
  out: "#c2724e", delivered: "#5b7a4f",
};

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user) return;
    api.get("/api/orders")
      .then((res) => setOrders(res.data))
      .catch(() => setErr("Could not load your orders"));
  }, [user]);

  if (!user) {
    return (
      <div className="ac-msg">
        <h2>Please log in to see your orders</h2>
        <Link to="/login" className="ac-btn">Log in</Link>
      </div>
    );
  }
  if (err) return <div className="ac-msg"><h2>{err}</h2></div>;
  if (!orders) return <div className="ac-msg">Loading your orders…</div>;

  if (orders.length === 0) {
    return (
      <div className="ac-msg">
        <h2>No orders yet</h2>
        <p>Once you place an order it will show up here.</p>
        <Link to="/products" className="ac-btn">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div className="ac-page">
      <h1 className="ac-title">My Orders</h1>
      <div className="ac-orders">
        {orders.map((o) => (
          <Link to={`/order/${o.id}`} className="ac-order" key={o.id}>
            <div className="ac-order-head">
              <span className="ac-oid">Order #{o.id}</span>
              <span
                className="ac-badge"
                style={{ background: STATUS_COLOR[o.status] || "#7a8273" }}
              >
                {o.statusLabel || o.status}
              </span>
            </div>
            <div className="ac-order-body">
              <div className="ac-thumbs">
                {(o.items || []).slice(0, 4).map((it, i) => (
                  <img key={i} src={it.image} alt="" />
                ))}
                {o.items.length > 4 && (
                  <span className="ac-more">+{o.items.length - 4}</span>
                )}
              </div>
              <div className="ac-order-meta">
                <p>
                  {o.items.length} item{o.items.length !== 1 ? "s" : ""} ·{" "}
                  <strong>₹{o.total}</strong>
                </p>
                <p className="ac-muted">
                  Placed {new Date(o.createdAt).toLocaleDateString()}
                  {o.status !== "delivered" && o.expectedDelivery && (
                    <> · Arriving by{" "}
                      {new Date(o.expectedDelivery).toLocaleDateString(undefined, {
                        day: "numeric", month: "short",
                      })}
                    </>
                  )}
                </p>
              </div>
              <span className="ac-track">Track →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
