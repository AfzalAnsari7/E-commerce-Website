import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import api from "../services"; // axios instance
import PasswordInput from "../components/PasswordInput";

// Single page, two steps:
//   1. "request" — enter email, get a reset code by email
//   2. "reset"   — enter the code + a new password
// Works for any account, including admins (admin is just a user).
export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  // Header "Reset Password" link passes the logged-in user's email here
  const [email, setEmail] = useState(location.state?.email || "");
  const [step, setStep] = useState("request");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function requestCode(e) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const res = await api.post("/api/auth/forgot-password", { email });
      setMsg(res.data.message || "If that account exists, a reset code has been sent.");
      // Dev convenience: Ethereal preview link when USE_ETHEREAL=true
      if (res.data.preview) console.log("Password reset email preview:", res.data.preview);
      setStep("reset");
    } catch (err) {
      alert(err.response?.data?.message || "Could not send reset email");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    if (password !== confirm) {
      alert("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/api/auth/reset-password", { email, code, password });
      alert(res.data.message || "Password reset successful. You can now log in.");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-6">
        <h3>Reset Password</h3>

        {step === "request" ? (
          <>
            <p>Enter your account email and we'll send you a reset code.</p>
            <form onSubmit={requestCode}>
              <div className="mb-3">
                <label className="form-label" htmlFor="fp-email">Email</label>
                <input
                  id="fp-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button className="btn btn-primary" disabled={loading}>
                {loading ? "Sending..." : "Send reset code"}
              </button>{" "}
              <Link to="/login" className="btn btn-link">Back to login</Link>
            </form>
          </>
        ) : (
          <>
            {msg && <p className="text-success">{msg}</p>}
            <p>Enter the code sent to <strong>{email}</strong> and choose a new password.</p>
            <form onSubmit={resetPassword}>
              <div className="mb-3">
                <label className="form-label" htmlFor="fp-code">Reset code</label>
                <input
                  id="fp-code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="form-control"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  maxLength={6}
                />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="fp-pass">New password</label>
                <PasswordInput
                  id="fp-pass"
                  name="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="fp-confirm">Confirm new password</label>
                <PasswordInput
                  id="fp-confirm"
                  name="confirm"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <button className="btn btn-success" disabled={loading}>
                {loading ? "Resetting..." : "Reset password"}
              </button>{" "}
              <button
                type="button"
                className="btn btn-link"
                onClick={() => setStep("request")}
              >
                Resend code
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
