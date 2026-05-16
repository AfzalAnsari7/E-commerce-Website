import React, { useState } from "react";

// A password field with a Show/Hide toggle. Drop-in replacement for a
// Bootstrap-styled <input type="password">: pass the same props
// (id, value, onChange, autoComplete, required, minLength, ...) and
// they're forwarded to the underlying input.
export default function PasswordInput({ className = "form-control", ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-group">
      <input
        {...props}
        type={show ? "text" : "password"}
        className={className}
      />
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
