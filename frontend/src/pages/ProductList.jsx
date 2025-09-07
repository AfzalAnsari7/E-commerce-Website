import React, { useEffect, useState } from 'react'
import api from '../services'
import ProductCard from '../components/ProductCard'
export default function ProductList(){
  const [products, setProducts] = useState([])
  useEffect(()=>{ api.get('/api/products').then(res => setProducts(res.data)).catch(()=>{}) },[])
  return (
    <div>
      <h3>All Products</h3>
      <div className="row g-3">
        {products.map(p=> (<div className="col-sm-6 col-md-4" key={p.id}><ProductCard product={p} /></div>))}
      </div>
    </div>
  )
}
