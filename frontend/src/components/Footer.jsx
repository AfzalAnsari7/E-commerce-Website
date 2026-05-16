import React from "react";
import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="ss-footer">
      <div className="ss-footer-cols">
        <div>
          <h4>AXEN WEAR</h4>
          <p>Officially yours. Streetwear, pop-culture &amp; everyday essentials.</p>
        </div>
        <div>
          <h5>Shop</h5>
          <Link to="/products?category=Men">Men</Link>
          <Link to="/products?category=Women">Women</Link>
          <Link to="/products?category=Sneakers">Sneakers</Link>
          <Link to="/products">All Products</Link>
        </div>
        <div>
          <h5>Help</h5>
          <Link to="/page/contact">Contact Us</Link>
          <Link to="/page/shipping">Shipping</Link>
          <Link to="/page/returns">Returns &amp; Exchanges</Link>
          <Link to="/cart">My Bag</Link>
        </div>
        <div>
          <h5>Company</h5>
          <Link to="/page/about">About</Link>
          <Link to="/page/careers">Careers</Link>
          <Link to="/page/terms">Terms</Link>
          <Link to="/page/privacy">Privacy</Link>
        </div>
      </div>
      <p className="ss-footer-copy">
        © {new Date().getFullYear()} Axen Wear. All rights reserved.
      </p>
    </footer>
  );
}
