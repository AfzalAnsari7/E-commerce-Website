import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../services'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { useAuth } from '../context/AuthContext'
import "./ProductDetails.styles.css"

const SIZES = ["S", "M", "L", "XL", "XXL"]
const SIZE_CHART = [
  { size: "S", chest: "36\"", length: "27\"" },
  { size: "M", chest: "38\"", length: "28\"" },
  { size: "L", chest: "40\"", length: "29\"" },
  { size: "XL", chest: "42\"", length: "30\"" },
  { size: "XXL", chest: "44\"", length: "31\"" },
]

// shrink a picked image to a max edge + JPEG quality so the
// payload stays small enough to store inline with the review
function compressImage(file, maxEdge = 1000, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("read failed"))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error("decode failed"))
      img.onload = () => {
        let { width, height } = img
        if (width > height && width > maxEdge) {
          height = Math.round((height * maxEdge) / width)
          width = maxEdge
        } else if (height > maxEdge) {
          width = Math.round((width * maxEdge) / height)
          height = maxEdge
        }
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        canvas.getContext("2d").drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

function Stars({ value, size = 16 }) {
  const v = Math.round(value)
  return (
    <span className="pd-stars" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={n <= v ? "" : "pd-star-dim"}>★</span>
      ))}
    </span>
  )
}

export default function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { isWished, toggleWishlist } = useWishlist()
  const { user } = useAuth()

  const [product, setProduct] = useState(null)
  const [status, setStatus] = useState("loading") // loading | ok | error
  const [size, setSize] = useState("M")
  const [added, setAdded] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  const [reviewData, setReviewData] = useState({ average: 0, count: 0, reviews: [] })
  const [myRating, setMyRating] = useState(0)
  const [myComment, setMyComment] = useState("")
  const [myImages, setMyImages] = useState([]) // compressed data URIs
  const [submitting, setSubmitting] = useState(false)
  const [lightbox, setLightbox] = useState(null) // src of zoomed review photo

  function loadReviews() {
    api.get(`/api/products/${id}/reviews`)
      .then(res => setReviewData(res.data))
      .catch(() => setReviewData({ average: 0, count: 0, reviews: [] }))
  }

  useEffect(() => {
    setProduct(null)
    setStatus("loading")
    api.get(`/api/products/${id}`)
      .then(res => { setProduct(res.data); setStatus("ok") })
      .catch(() => setStatus("error"))
    loadReviews()
  }, [id])

  if (status === "loading") return <div className="pd-loading">Loading product…</div>

  if (status === "error" || !product) {
    return (
      <div className="pd-notfound">
        <h2>Product not available</h2>
        <p>This product may have been removed or is temporarily unavailable.</p>
        <Link to="/products" className="pd-notfound-btn">Browse all products</Link>
      </div>
    )
  }

  const mrp = Number(product.mrp) || 0
  const hasDiscount = mrp > product.price
  const off = hasDiscount ? Math.round(((mrp - product.price) / mrp) * 100) : 0
  const wished = isWished(product.id)
  const { average, count, reviews } = reviewData
  const availableSizes =
    Array.isArray(product.sizes) && product.sizes.length ? product.sizes : SIZES
  const activeSize = availableSizes.includes(size) ? size : availableSizes[0]

  function addToBag() {
    addToCart({ ...product, size: activeSize }, 1)
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  async function onPickImages(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = "" // allow re-picking the same file
    if (!files.length) return
    const room = 4 - myImages.length
    if (room <= 0) return alert("You can attach up to 4 photos")
    try {
      const compressed = await Promise.all(
        files.slice(0, room).map(f => compressImage(f))
      )
      setMyImages(prev => [...prev, ...compressed])
    } catch {
      alert("Couldn't process that image — try another file")
    }
  }

  function removeImage(idx) {
    setMyImages(prev => prev.filter((_, i) => i !== idx))
  }

  async function submitReview(e) {
    e.preventDefault()
    if (!myRating) return alert("Please select a star rating")
    setSubmitting(true)
    try {
      await api.post(`/api/products/${id}/reviews`, {
        rating: myRating,
        comment: myComment,
        images: myImages,
      })
      setMyRating(0)
      setMyComment("")
      setMyImages([])
      loadReviews()
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit review")
    } finally {
      setSubmitting(false)
    }
  }

  function goBack() {
    if (window.history.length > 2) navigate(-1)
    else navigate("/products")
  }

  return (
    <div className="pd-page">
      <button type="button" className="pd-back" onClick={goBack}>
        ← Back
      </button>
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
        <div className="pd-gallery">
          <div className="pd-main-img">
            <img src={product.image} alt={product.title} />
            {hasDiscount && <span className="pd-off-tag">{off}% OFF</span>}
          </div>
        </div>

        <div className="pd-info">
          <p className="pd-brand">AXEN WEAR</p>
          <h1 className="pd-title">{product.title}</h1>

          <div className="pd-rating">
            {count > 0 ? (
              <>
                <Stars value={average} />
                <span className="pd-rating-count">
                  {average} · {count} rating{count !== 1 ? "s" : ""}
                </span>
              </>
            ) : (
              <span className="pd-rating-count">No ratings yet</span>
            )}
          </div>

          <div className="pd-price-row">
            <span className="pd-price">₹{product.price}</span>
            {hasDiscount && <span className="pd-mrp">₹{mrp}</span>}
            {hasDiscount && <span className="pd-off">({off}% OFF)</span>}
          </div>
          <p className="pd-tax">inclusive of all taxes</p>

          <div className="pd-sizes">
            <div className="pd-sizes-head">
              <span>Select Size</span>
              <button
                type="button"
                className="pd-size-guide"
                onClick={() => setGuideOpen(true)}
              >
                Size Guide
              </button>
            </div>
            <div className="pd-size-list">
              {SIZES.map(s => {
                const avail = availableSizes.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={!avail}
                    title={avail ? "" : "Out of stock"}
                    className={`pd-size ${activeSize === s ? "active" : ""} ${avail ? "" : "unavailable"}`}
                    onClick={() => avail && setSize(s)}
                  >
                    {s}
                  </button>
                )
              })}
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

      {/* Reviews */}
      <section className="pd-reviews">
        <h2>
          Ratings &amp; Reviews
          {count > 0 && (
            <span className="pd-reviews-avg">
              <Stars value={average} /> {average} / 5 · {count} review{count !== 1 ? "s" : ""}
            </span>
          )}
        </h2>

        {user ? (
          <form className="pd-review-form" onSubmit={submitReview}>
            <p className="pd-review-form-title">Write a review</p>
            <div className="pd-star-input">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  type="button"
                  key={n}
                  className={n <= myRating ? "on" : ""}
                  onClick={() => setMyRating(n)}
                  aria-label={`${n} star`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              placeholder="Share your experience (optional)"
              value={myComment}
              onChange={(e) => setMyComment(e.target.value)}
            />

            <div className="pd-review-photos">
              {myImages.map((src, i) => (
                <div className="pd-review-thumb" key={i}>
                  <img src={src} alt={`upload ${i + 1}`} />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => removeImage(i)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {myImages.length < 4 && (
                <label className="pd-review-addphoto">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={onPickImages}
                  />
                  <span>＋</span>
                  <small>Add photo</small>
                </label>
              )}
            </div>
            <p className="pd-review-photohint">
              Add up to 4 photos to show how it really looks (optional)
            </p>

            <button className="pd-review-submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit Review"}
            </button>
          </form>
        ) : (
          <p className="pd-review-login">
            <Link to="/login">Log in</Link> to rate this product.
          </p>
        )}

        <div className="pd-review-list">
          {reviews.length === 0 ? (
            <p className="pd-review-empty">No reviews yet — be the first!</p>
          ) : (
            reviews.map(r => (
              <div className="pd-review" key={r.id}>
                <div className="pd-review-head">
                  <strong>{r.userName}</strong>
                  <Stars value={r.rating} size={14} />
                  <span className="pd-review-date">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {r.comment && <p className="pd-review-text">{r.comment}</p>}
                {Array.isArray(r.images) && r.images.length > 0 && (
                  <div className="pd-review-gallery">
                    {r.images.map((src, i) => (
                      <button
                        type="button"
                        className="pd-review-photo"
                        key={i}
                        onClick={() => setLightbox(src)}
                        aria-label="View photo"
                      >
                        <img src={src} alt={`review by ${r.userName} ${i + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Review photo lightbox */}
      {lightbox && (
        <div
          className="pd-lightbox"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-label="Review photo"
        >
          <button
            className="pd-lightbox-close"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            ✕
          </button>
          <img src={lightbox} alt="Review photo" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Size guide modal */}
      {guideOpen && (
        <div className="pd-modal-overlay" onClick={() => setGuideOpen(false)}>
          <div className="pd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pd-modal-head">
              <h3>Size Guide</h3>
              <button onClick={() => setGuideOpen(false)} aria-label="Close">✕</button>
            </div>
            <p className="pd-modal-sub">Measurements in inches. Fit may vary by style.</p>
            <table className="pd-size-table">
              <thead>
                <tr><th>Size</th><th>Chest</th><th>Length</th></tr>
              </thead>
              <tbody>
                {SIZE_CHART.map(row => (
                  <tr key={row.size}>
                    <td>{row.size}</td><td>{row.chest}</td><td>{row.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
