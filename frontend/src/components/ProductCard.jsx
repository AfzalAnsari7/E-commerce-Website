import React from 'react'
import { Link } from 'react-router-dom'
export default function ProductCard({product}){
  return (
    <div className="card h-100 shadow-sm">
      <img src={product.image} className="card-img-top" alt={product.title} style={{height:150, objectFit:'cover'}}/>
      <div className="card-body d-flex flex-column">
        <h5 className="card-title">{product.title}</h5>
        <p className="card-text text-muted mb-2">₹{product.price}</p>
        <div className="mt-auto">
          <Link to={`/products/${product.id}`} className="btn btn-primary w-100">View</Link>
        </div>
      </div>
    </div>
  )
}
