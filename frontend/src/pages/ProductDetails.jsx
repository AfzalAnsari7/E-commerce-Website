import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../services'
import { useCart } from '../context/CartContext'
import "./ProductDetails.styles.css"
import demoProducts from '../data/product'

export default function ProductDetails() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const { addToCart } = useCart()

  useEffect(() => {
    api.get(`/api/products/${id}`)
      .then(res => setProduct(res.data))
      .catch(() => {
        const fallback = demoProducts.find(p => p.id === parseInt(id))
        setProduct(fallback)
      })
  }, [id])

  if (!product) return <div>Loading...</div>

  return (
    <div className="details-container">

      <div className="details-left">
        <img src={product.image} alt={product.title} className="details-image"/>
      </div>

      <div className="details-right">
        <h1>{product.title}</h1>

        <h2 className="price">₹{product.price}</h2>

        <p className="description">{product.description}</p>

        <button className="add-btn" onClick={() => addToCart(product, 1)}>
          Add to Cart
        </button>
      </div>

    </div>
  )
}
