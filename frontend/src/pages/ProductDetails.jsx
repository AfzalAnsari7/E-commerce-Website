// src/pages/ProductDetails.js
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../services'
import { useCart } from '../context/CartContext'
import demoProducts from '../data/product'   // ✅ import fake products

export default function ProductDetails() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const { addToCart } = useCart()

  useEffect(() => {
    api.get(`/api/product/${id}`)
      .then(res => setProduct(res.data))
      .catch(() => {
        console.warn("Backend not available, showing demo product")
        const fallback = demoProducts.find(p => p.id === parseInt(id))
        setProduct(fallback)
      })
  }, [id])

  if (!product) return <div>Loading...</div>

  return (
    <div className="row">
      <div className="col-md-6">
        <img src={product.image} alt={product.title} className="img-fluid rounded" />
      </div>
      <div className="col-md-6">
        <h2>{product.title}</h2>
        <p className="text-muted">₹{product.price}</p>
        <p>{product.description}</p>
        <button className="btn btn-primary" onClick={() => addToCart(product, 1)}>
          Add to Cart
        </button>
      </div>
    </div>
  )
}
