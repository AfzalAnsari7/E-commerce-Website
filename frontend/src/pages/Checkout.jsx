import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import AddressForm from "../components/AddressForm";
import "./Checkout.styles.css";

const FREE_SHIP_OVER = 999;
const SHIP_FEE = 49;

const PAYMENTS = [
  {
    key: "Online",
    label: "Pay Online",
    desc: "UPI, Cards, Netbanking & Wallets — secured by Razorpay",
  },
  { key: "COD", label: "Cash on Delivery", desc: "Pay in cash when the order arrives" },
];

// load Razorpay's checkout script once, on demand
function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function Checkout() {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [payment, setPayment] = useState("Online");
  const [placing, setPlacing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const subtotal = cart.reduce((s, p) => s + p.price * p.qty, 0);
  const bagMrp = cart.reduce((s, p) => s + (Number(p.mrp) > p.price ? p.mrp : p.price) * p.qty, 0);
  const discount = bagMrp - subtotal;
  const itemCount = cart.reduce((s, p) => s + p.qty, 0);
  const shipping = subtotal >= FREE_SHIP_OVER ? 0 : SHIP_FEE;
  const total = subtotal + shipping;

  useEffect(() => {
    if (!user) return;
    api.get("/api/addresses")
      .then((res) => {
        setAddresses(res.data);
        const def = res.data.find((a) => a.isDefault) || res.data[0];
        setSelected(def ? def.id : null);
        setShowForm(res.data.length === 0);
      })
      .catch(() => setShowForm(true))
      .finally(() => setLoaded(true));
  }, [user]);

  if (!user) {
    return (
      <div className="ck-msg">
        <h2>Please log in to check out</h2>
        <Link to="/login" className="ck-btn">Log in</Link>
      </div>
    );
  }
  if (cart.length === 0) {
    return (
      <div className="ck-msg">
        <h2>Your bag is empty</h2>
        <Link to="/products" className="ck-btn">Start Shopping</Link>
      </div>
    );
  }

  async function saveAddress(data) {
    setSaving(true);
    try {
      const res = editing
        ? await api.put(`/api/addresses/${editing.id}`, data)
        : await api.post("/api/addresses", data);
      setAddresses(res.data);
      const pick = editing
        ? editing.id
        : res.data[res.data.length - 1]?.id;
      setSelected(pick);
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      alert(err.response?.data?.message || "Could not save address");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAddress(id) {
    if (!window.confirm("Delete this address?")) return;
    try {
      const res = await api.delete(`/api/addresses/${id}`);
      setAddresses(res.data);
      if (selected === id) setSelected(res.data[0]?.id || null);
      if (res.data.length === 0) setShowForm(true);
    } catch {
      alert("Could not delete address");
    }
  }

  async function placeOrder() {
    const addr = addresses.find((a) => a.id === selected);
    if (!addr) return alert("Please select a delivery address");
    setPlacing(true);

    // --- Cash on Delivery: place immediately ---
    if (payment === "COD") {
      try {
        const res = await api.post("/api/orders", { items: cart, address: addr });
        clearCart();
        navigate(`/order/${res.data.orderId}`);
      } catch (err) {
        alert(err.response?.data?.message || "Order failed, try again");
        setPlacing(false);
      }
      return;
    }

    // --- Pay Online via Razorpay ---
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load the payment screen");

      const { data } = await api.post("/api/payment/create", {
        items: cart,
        address: addr,
      });

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.razorpayOrderId,
        name: "Axen Wear",
        description: `Order ${data.orderId}`,
        prefill: { name: data.name, email: data.email, contact: data.contact },
        theme: { color: "#2e3a2b" },
        handler: async (resp) => {
          try {
            await api.post("/api/payment/verify", {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            clearCart();
            navigate(`/order/${data.orderId}`);
          } catch (err) {
            alert(
              err.response?.data?.message ||
                "Payment captured but verification failed — contact support with order " +
                  data.orderId
            );
            setPlacing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPlacing(false);
          },
        },
      });
      rzp.on("payment.failed", (r) => {
        alert("Payment failed: " + (r.error?.description || "please try again"));
        setPlacing(false);
      });
      rzp.open();
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Could not start payment");
      setPlacing(false);
    }
  }

  return (
    <div className="ck-page">
      <h1 className="ck-title">Checkout</h1>

      <div className="ck-grid">
        <div className="ck-left">
          {/* 1. Address */}
          <section className="ck-card">
            <h2><span className="ck-step">1</span> Delivery Address</h2>

            {loaded && addresses.length > 0 && !showForm && (
              <div className="ck-addr-list">
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    className={`ck-addr ${selected === a.id ? "on" : ""}`}
                  >
                    <input
                      type="radio" name="addr"
                      checked={selected === a.id}
                      onChange={() => setSelected(a.id)}
                    />
                    <div className="ck-addr-body">
                      <div className="ck-addr-top">
                        <strong>{a.fullName}</strong>
                        <span className="ck-tag">{a.type}</span>
                        {a.isDefault && <span className="ck-tag ck-default">Default</span>}
                        <span className="ck-addr-phone">{a.phone}</span>
                      </div>
                      <p>
                        {a.line1}{a.line2 ? `, ${a.line2}` : ""}
                        {a.landmark ? `, near ${a.landmark}` : ""}, {a.city},{" "}
                        {a.state} - <strong>{a.pincode}</strong>
                      </p>
                      <div className="ck-addr-acts">
                        <button type="button" onClick={() => { setEditing(a); setShowForm(true); }}>
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteAddress(a.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </label>
                ))}
                <button
                  type="button" className="ck-add-new"
                  onClick={() => { setEditing(null); setShowForm(true); }}
                >
                  + Add a new address
                </button>
              </div>
            )}

            {showForm && (
              <AddressForm
                initial={editing}
                saving={saving}
                onSave={saveAddress}
                onCancel={
                  addresses.length > 0
                    ? () => { setShowForm(false); setEditing(null); }
                    : null
                }
              />
            )}
          </section>

          {/* 2. Payment */}
          <section className="ck-card">
            <h2><span className="ck-step">2</span> Payment Method</h2>
            <div className="ck-pay">
              {PAYMENTS.map((p) => (
                <label key={p.key} className={`ck-pay-opt ${payment === p.key ? "on" : ""}`}>
                  <input
                    type="radio" name="pay"
                    checked={payment === p.key}
                    onChange={() => setPayment(p.key)}
                  />
                  <span>
                    <strong>{p.label}</strong>
                    <em>{p.desc}</em>
                  </span>
                </label>
              ))}
            </div>
            {payment === "Online" && (
              <p className="ck-pay-note">
                You'll be redirected to Razorpay's secure checkout to pay by
                UPI, card, netbanking or wallet.
              </p>
            )}
          </section>
        </div>

        {/* Summary */}
        <aside className="ck-summary">
          <h3>Order Summary</h3>
          <div className="ck-items">
            {cart.map((p) => (
              <div className="ck-item" key={`${p.id}-${p.size || ""}`}>
                <img src={p.image} alt="" />
                <div>
                  <p className="ck-item-name">{p.title}</p>
                  <span>Size {p.size || "—"} · Qty {p.qty}</span>
                </div>
                <strong>₹{p.price * p.qty}</strong>
              </div>
            ))}
          </div>
          <div className="ck-row"><span>Bag total ({itemCount})</span><span>₹{bagMrp}</span></div>
          {discount > 0 && (
            <div className="ck-row"><span>Discount</span><span className="ck-green">− ₹{discount}</span></div>
          )}
          <div className="ck-row">
            <span>Delivery</span>
            <span>{shipping === 0 ? <em className="ck-free">FREE</em> : `₹${shipping}`}</span>
          </div>
          <div className="ck-row ck-total"><span>Total</span><span>₹{total}</span></div>

          <button className="ck-place" onClick={placeOrder} disabled={placing}>
            {placing
              ? "Processing…"
              : payment === "Online"
              ? `Pay ₹${total}`
              : `Place Order · ₹${total}`}
          </button>
          <Link to="/cart" className="ck-back">← Back to bag</Link>
        </aside>
      </div>
    </div>
  );
}
