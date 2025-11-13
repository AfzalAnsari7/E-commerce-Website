import React, { useEffect, useState } from 'react'
import api from '../services'
import ProductCard from '../components/ProductCard'
import { Link } from 'react-router-dom'
export default function Home(){
  const [products, setProducts] = useState([])
  useEffect(()=>{ api.get('/api/products').then(res => setProducts(res.data.slice(0,6))).catch(()=>{}) },[])
  return (
    <div>
      <div className="jumbotron p-4 rounded bg-light mb-4">
        <h1>Welcome to E‑Shop</h1>
        <p className="lead">A e‑commerce project built with React + Node.js</p>
        <Link to="/products" className="btn btn-success">Browse Products</Link>
      </div>
      <h4>Featured</h4>
      <div className="row g-3">
        {products.map(p=> (<div className="col-sm-6 col-md-4" key={p.id}><ProductCard product={p} /></div>))}
      </div>
    </div>
  )
}
