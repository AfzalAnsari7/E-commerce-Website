import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services"; // your axios instance

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const { name, email, password } = location.state || {};

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  if (!email) {
    navigate("/register");
    return null;
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/api/auth/verify-otp", { name, email, password, otp });

      // Save token and user
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      alert("Registration successful!");
      navigate("/"); // redirect to home
    } catch (err) {
      alert(err.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-6">
        <h3>Verify OTP</h3>
        <p>An OTP was sent to <strong>{email}</strong>. Enter it below to complete registration.</p>
        <form onSubmit={submit}>
          <div className="mb-3">
            <label className="form-label">OTP</label>
            <input
              className="form-control"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength={6}
            />
          </div>
          <button className="btn btn-success" disabled={loading}>
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>
      </div>
    </div>
  );
}
