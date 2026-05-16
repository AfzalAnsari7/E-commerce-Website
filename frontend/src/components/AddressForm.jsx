import React, { useState } from "react";
import "./AddressForm.css";

const EMPTY = {
  fullName: "", phone: "", pincode: "", line1: "", line2: "",
  landmark: "", city: "", state: "", type: "Home",
};

export default function AddressForm({ initial, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY, ...(initial || {}) });
  const [pinLoading, setPinLoading] = useState(false);
  const [err, setErr] = useState("");

  function set(k, v) {
    setF((p) => ({ ...p, [k]: v }));
  }

  // auto-fill city/state from pincode via the free India Post API
  async function onPincode(v) {
    const pin = v.replace(/\D/g, "").slice(0, 6);
    set("pincode", pin);
    if (pin.length !== 6) return;
    setPinLoading(true);
    try {
      const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await r.json();
      const po = data?.[0]?.PostOffice?.[0];
      if (po) {
        setF((p) => ({
          ...p,
          city: p.city || po.District || "",
          state: po.State || "",
        }));
      }
    } catch {
      /* offline / API down — user can still type city & state */
    } finally {
      setPinLoading(false);
    }
  }

  function submit(e) {
    e.preventDefault();
    setErr("");
    if (!/^\d{10}$/.test(f.phone)) return setErr("Phone must be exactly 10 digits");
    if (!/^\d{6}$/.test(f.pincode)) return setErr("Pincode must be 6 digits");
    for (const [k, label] of [
      ["fullName", "Full name"], ["line1", "Address"],
      ["city", "City"], ["state", "State"],
    ]) {
      if (!String(f[k]).trim()) return setErr(`${label} is required`);
    }
    onSave(f);
  }

  return (
    <form className="af" onSubmit={submit}>
      {err && <p className="af-err">{err}</p>}

      <div className="af-row">
        <div className="af-field">
          <label htmlFor="af-name">Full Name</label>
          <input
            id="af-name" name="fullName" autoComplete="name"
            value={f.fullName} onChange={(e) => set("fullName", e.target.value)}
            placeholder="e.g. Afzal Ansari" required
          />
        </div>
        <div className="af-field">
          <label htmlFor="af-phone">Mobile Number</label>
          <input
            id="af-phone" name="phone" inputMode="numeric" autoComplete="tel"
            value={f.phone}
            onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit mobile number" required
          />
        </div>
      </div>

      <div className="af-row">
        <div className="af-field">
          <label htmlFor="af-pin">Pincode</label>
          <input
            id="af-pin" name="pincode" inputMode="numeric" autoComplete="postal-code"
            value={f.pincode} onChange={(e) => onPincode(e.target.value)}
            placeholder="6-digit pincode" required
          />
          {pinLoading && <small className="af-hint">Looking up area…</small>}
        </div>
        <div className="af-field">
          <label htmlFor="af-city">City / District</label>
          <input
            id="af-city" name="city" autoComplete="address-level2"
            value={f.city} onChange={(e) => set("city", e.target.value)}
            placeholder="City" required
          />
        </div>
        <div className="af-field">
          <label htmlFor="af-state">State</label>
          <input
            id="af-state" name="state" autoComplete="address-level1"
            value={f.state} onChange={(e) => set("state", e.target.value)}
            placeholder="State" required
          />
        </div>
      </div>

      <div className="af-field">
        <label htmlFor="af-l1">Flat / House No., Building, Street</label>
        <input
          id="af-l1" name="line1" autoComplete="address-line1"
          value={f.line1} onChange={(e) => set("line1", e.target.value)}
          placeholder="House no., building, street" required
        />
      </div>

      <div className="af-row">
        <div className="af-field">
          <label htmlFor="af-l2">Area / Colony / Locality</label>
          <input
            id="af-l2" name="line2" autoComplete="address-line2"
            value={f.line2} onChange={(e) => set("line2", e.target.value)}
            placeholder="Area, colony (optional)"
          />
        </div>
        <div className="af-field">
          <label htmlFor="af-lm">Landmark</label>
          <input
            id="af-lm" name="landmark"
            value={f.landmark} onChange={(e) => set("landmark", e.target.value)}
            placeholder="Nearby landmark (optional)"
          />
        </div>
      </div>

      <div className="af-field">
        <label>Address Type</label>
        <div className="af-types">
          {["Home", "Work", "Other"].map((t) => (
            <button
              type="button" key={t}
              className={`af-type ${f.type === t ? "on" : ""}`}
              onClick={() => set("type", t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="af-actions">
        <button type="submit" className="af-save" disabled={saving}>
          {saving ? "Saving…" : "Save Address"}
        </button>
        {onCancel && (
          <button type="button" className="af-cancel" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
