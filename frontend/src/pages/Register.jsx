import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services"; // your axios instance
import PasswordInput from "../components/PasswordInput";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    try {
      const res = await api.post("/api/auth/request-otp", { name, email, password });

      // For Ethereal preview (testing only)
      if (res.data.preview) {
        alert("OTP Email Preview URL (Ethereal): " + res.data.preview);
      }

      alert("OTP sent to email! Check your inbox.");
      navigate("/verify-otp", { state: { name, email, password } });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send OTP");
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-6">
        <h3>Register</h3>
        <form onSubmit={submit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="reg-name">Full name</label>
            <input
              id="reg-name"
              name="name"
              autoComplete="name"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              name="email"
              type="email"
              autoComplete="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <PasswordInput
              id="reg-password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button className="btn btn-success">Send OTP</button>
        </form>
      </div>
    </div>
  );
}
