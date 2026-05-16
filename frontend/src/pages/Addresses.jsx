import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services";
import { useAuth } from "../context/AuthContext";
import AddressForm from "../components/AddressForm";
import "./Account.styles.css";

export default function Addresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get("/api/addresses")
      .then((res) => setAddresses(res.data))
      .catch(() => setAddresses([]));
  }, [user]);

  if (!user) {
    return (
      <div className="ac-msg">
        <h2>Please log in to manage addresses</h2>
        <Link to="/login" className="ac-btn">Log in</Link>
      </div>
    );
  }
  if (!addresses) return <div className="ac-msg">Loading…</div>;

  async function save(data) {
    setSaving(true);
    try {
      const res = editing
        ? await api.put(`/api/addresses/${editing.id}`, data)
        : await api.post("/api/addresses", data);
      setAddresses(res.data);
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      alert(err.response?.data?.message || "Could not save address");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this address?")) return;
    try {
      const res = await api.delete(`/api/addresses/${id}`);
      setAddresses(res.data);
    } catch {
      alert("Could not delete address");
    }
  }

  async function makeDefault(a) {
    try {
      const res = await api.put(`/api/addresses/${a.id}`, { ...a, isDefault: true });
      setAddresses(res.data);
    } catch {
      alert("Could not set default");
    }
  }

  return (
    <div className="ac-page">
      <h1 className="ac-title">My Addresses</h1>

      {showForm ? (
        <div className="ac-card">
          <h2>{editing ? "Edit Address" : "Add New Address"}</h2>
          <AddressForm
            initial={editing}
            saving={saving}
            onSave={save}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </div>
      ) : (
        <button
          className="ac-btn ac-add"
          onClick={() => { setEditing(null); setShowForm(true); }}
        >
          + Add New Address
        </button>
      )}

      <div className="ac-addr-grid">
        {addresses.map((a) => (
          <div className={`ac-addr ${a.isDefault ? "is-def" : ""}`} key={a.id}>
            <div className="ac-addr-top">
              <strong>{a.fullName}</strong>
              <span className="ac-tag">{a.type}</span>
              {a.isDefault && <span className="ac-tag ac-def-tag">Default</span>}
            </div>
            <p className="ac-addr-phone">{a.phone}</p>
            <p className="ac-addr-text">
              {a.line1}{a.line2 ? `, ${a.line2}` : ""}
              {a.landmark ? `, near ${a.landmark}` : ""}, {a.city}, {a.state} -{" "}
              <strong>{a.pincode}</strong>
            </p>
            <div className="ac-addr-acts">
              <button onClick={() => { setEditing(a); setShowForm(true); }}>Edit</button>
              <button onClick={() => remove(a.id)}>Delete</button>
              {!a.isDefault && (
                <button onClick={() => makeDefault(a)}>Set as default</button>
              )}
            </div>
          </div>
        ))}
        {addresses.length === 0 && !showForm && (
          <p className="ac-muted">No saved addresses yet.</p>
        )}
      </div>
    </div>
  );
}
