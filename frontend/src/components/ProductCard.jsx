import React from 'react'
import { Link } from 'react-router-dom'
import { useWishlist } from '../context/WishlistContext'
import "./ProductCard.css";

export default function ProductCard({ product }) {
  // Real MRP from product data; only show a discount if it's set above price.
  const mrp = Number(product.mrp) || 0;
  const hasDiscount = mrp > product.price;
  const off = hasDiscount ? Math.round(((mrp - product.price) / mrp) * 100) : 0;

  const { isWished, toggleWishlist } = useWishlist();
  const wished = isWished(product.id);

  // Rating comes from the products API (avg of reviews). 0 = no reviews yet.
  const rating = Number(product.rating) || 0;
  const ratingCount = Number(product.ratingCount) || 0;
  const fullStars = Math.round(rating);

  return (
    <Link to={`/products/${product.id}`} className="ss-card">
      <div className="ss-card-media">
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src =
              "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='400'><rect width='100%25' height='100%25' fill='%23f0f0f0'/><text x='50%25' y='50%25' font-size='16' fill='%23999' text-anchor='middle' dy='.3em'>No image</text></svg>";
          }}
        />
        <button
          type="button"
          className={`ss-wish ${wished ? "wished" : ""}`}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wished}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product);
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24"
            fill={wished ? "currentColor" : "none"}
            stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
        </button>
        {hasDiscount && <span className="ss-tag">{off}% OFF</span>}
      </div>

      <div className="ss-card-body">
        <p className="ss-brand">AXEN WEAR</p>
        <h3 className="ss-name">{product.title}</h3>
        {ratingCount > 0 && (
          <div className="ss-rating" aria-label={`Rated ${rating} out of 5`}>
            <span className="ss-stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n <= fullStars ? "on" : ""}>★</span>
              ))}
            </span>
            <span className="ss-rating-count">{rating.toFixed(1)} ({ratingCount})</span>
          </div>
        )}
        <div className="ss-price-row">
          <span className="ss-price">₹{product.price}</span>
          {hasDiscount && <span className="ss-mrp">₹{mrp}</span>}
          {hasDiscount && <span className="ss-off">({off}% OFF)</span>}
        </div>
      </div>
    </Link>
  )
}
