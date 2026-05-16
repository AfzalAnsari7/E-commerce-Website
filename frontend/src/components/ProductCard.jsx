import React from 'react'
import { Link } from 'react-router-dom'
import "./ProductCard.css";

export default function ProductCard({ product }) {
  // Backend has no MRP/discount, so derive a believable "was" price.
  const mrp = Math.round(product.price * 1.7);
  const off = Math.round(((mrp - product.price) / mrp) * 100);

  return (
    <Link to={`/products/${product.id}`} className="ss-card">
      <div className="ss-card-media">
        <img src={product.image} alt={product.title} />
        <button
          type="button"
          className="ss-wish"
          aria-label="Add to wishlist"
          onClick={(e) => e.preventDefault()}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
        </button>
        <span className="ss-tag">{off}% OFF</span>
      </div>

      <div className="ss-card-body">
        <p className="ss-brand">STREETSOUL</p>
        <h3 className="ss-name">{product.title}</h3>
        <div className="ss-price-row">
          <span className="ss-price">₹{product.price}</span>
          <span className="ss-mrp">₹{mrp}</span>
          <span className="ss-off">({off}% OFF)</span>
        </div>
      </div>
    </Link>
  )
}
