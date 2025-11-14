import React, { useEffect, useState } from "react";
import api from "../services";
import ProductCard from "../components/ProductCard";
import { Link } from "react-router-dom";

export default function Home() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api
      .get("/api/products")
      .then((res) => setProducts(res.data.slice(0, 6)))
      .catch(() => {});
  }, []);

  return (
    <div className="home-page">

      {/* Hero Section */}
      <section className="hero-section d-flex align-items-center justify-content-center text-center text-light">
        <div className="container py-5">
          <h1 className="display-4 fw-bold mb-3">
            Welcome to <span className="text-warning">E-Shop</span>
          </h1>

          <p className="lead mb-4">
            Discover exclusive deals, discounts and premium products.

          </p>

          <Link to="/products" className="btn btn-warning btn-lg px-4">
            Browse Products
          </Link>
        </div>
      </section>



      {/* Footer Section */}
<footer className="footer-section">
  <div className="footer-inner">
    <h5>E-Shop</h5>

    <p className="small">
      Your trusted platform for smart and secure shopping.
    </p>

    <div className="footer-links">
      <a href="#">Home</a>
      <a href="#">Products</a>
      <a href="#">About</a>
      <a href="#">Contact</a>
    </div>

    <p className="footer-copy">
      © {new Date().getFullYear()} E-Shop. All rights reserved.
    </p>
  </div>
</footer>

    </div>
  );
}
