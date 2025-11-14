import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
export default function Header() {
  const { cart } = useCart();
  const totalItems = cart.reduce((s, p) => s + p.qty, 0);
  const { user, logout } = useAuth();
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-black">
      <div className="container">
        <Link className="navbar-brand" to="/">
          E‑Shop
        </Link>
        <div>
          <ul className="navbar-nav me-auto">
            {user && user.isAdmin && (
              <li className="nav-item">
                <Link className="nav-link" to="/admin">
                  Admin
                </Link>
              </li>
            )}
          </ul>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {!user && (
            <Link to="/login" className="btn btn-outline-light">
              Login
            </Link>
          )}
          {!user && (
            <Link to="/register" className="btn btn-outline-light">
              Register
            </Link>
          )}
          {user && <div className="text-light me-2">Hi, {user.name}</div>}
          {user && (
            <button className="btn btn-outline-warning" onClick={logout}>
              Logout
            </button>
          )}
          <Link to="/cart" className="btn btn-outline-light">
            Cart ({totalItems})
          </Link>
        </div>
      </div>
    </nav>
  );
}
