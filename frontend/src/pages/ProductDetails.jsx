import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../services'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import demoProducts from '../data/product'
import "./ProductDetails.styles.css"

const SIZES = ["S", "M", "L", "XL", "XXL"]

export default function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [size, setSize] = useState("M")
  const [added, setAdded] = useState(false)
  const { addToCart } = useCart()
  const { isWished, toggleWishlist } = useWishlist()

  useEffect(() => {
    setProduct(null)
    api.get(`/api/products/${id}`)
      .then(res => setProduct(res.data))
      .catch(() => {
        const fallback = demoProducts.find(p => String(p.id) === String(id))
        setProduct(fallback || null)
      })
  }, [id])

  if (!product) {
    return <div className="pd-loading">Loading product…</div>
  }

  const mrp = Math.round(product.price * 1.7)
  const off = Math.round(((mrp - product.price) / mrp) * 100)
  const wished = isWished(product.id)

  function addToBag() {
    addToCart({ ...product, size }, 1)
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <div className="pd-page">
      <nav className="pd-crumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to={`/products?category=${product.category || ""}`}>
          {product.category || "Shop"}
        </Link>
        <span>/</span>
        <em>{product.title}</em>
      </nav>

      <div className="pd-grid">
        {/* Gallery */}
        <div className="pd-gallery">
          <div className="pd-main-img">
            <img src={product.image} alt={product.title} />
            {off > 0 && <span className="pd-off-tag">{off}% OFF</span>}
          </div>
        </div>

        {/* Info */}
        <div className="pd-info">
          <p className="pd-brand">STREETSOUL</p>
          <h1 className="pd-title">{product.title}</h1>

          <div className="pd-rating">
            <span className="pd-stars">★★★★<span className="pd-star-dim">★</span></span>
            <span className="pd-rating-count">4.2 · 128 ratings</span>
          </div>

          <div className="pd-price-row">
            <span className="pd-price">₹{product.price}</span>
            <span className="pd-mrp">₹{mrp}</span>
            <span className="pd-off">({off}% OFF)</span>
          </div>
          <p className="pd-tax">inclusive of all taxes</p>

          <div className="pd-sizes">
            <div className="pd-sizes-head">
              <span>Select Size</span>
              <span className="pd-size-guide">Size Guide</span>
            </div>
            <div className="pd-size-list">
              {SIZES.map(s => (
                <button
                  key={s}
                  className={`pd-size ${size === s ? "active" : ""}`}
                  onClick={() => setSize(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="pd-actions">
            <button className="pd-bag" onClick={addToBag}>
              {added ? "✓ Added to Bag" : "Add to Bag"}
            </button>
            <button
              className={`pd-wish ${wished ? "active" : ""}`}
              onClick={() => toggleWishlist(product)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24"
                fill={wished ? "currentColor" : "none"}
                stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
              </svg>
              {wished ? "Wishlisted" : "Wishlist"}
            </button>
          </div>

          {added && (
            <button className="pd-gocart" onClick={() => navigate("/cart")}>
              Go to Bag →
            </button>
          )}

          <div className="pd-perks">
            <div><strong>Free Shipping</strong><span>on orders above ₹999</span></div>
            <div><strong>30-Day Returns</strong><span>easy & hassle-free</span></div>
            <div><strong>Secure Checkout</strong><span>100% protected</span></div>
          </div>

          <div className="pd-desc">
            <h3>Product Details</h3>
            <p>{product.description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
