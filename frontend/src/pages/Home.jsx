import React, { useEffect, useState } from 'react'
import api from '../services'
import ProductCard from '../components/ProductCard'
import { Link } from 'react-router-dom'
export default function Home(){
  const [products, setProducts] = useState([])
  useEffect(()=>{ 
    api.get('/api/products')
      .then(res => setProducts(res.data.slice(0,6)))
      .catch(()=>{}) 
  },[])

  return (
    <div className="home-background">  {/* Wrap content with this div */}
      <div className="overlay"> {/* Optional: fade overlay */}
        <div className="jumbotron p-4 rounded bg-light mb-4">
          <h1>Welcome to E‑Shop</h1>
          <p className="lead">
            A e‑commerce project built with React + Node.js — This project is currently deployed with frontend only on Netlify.

✅ Frontend is fully functional and showcases the UI, authentication pages, cart, and admin panel.

⚡ Backend (Node.js, Express, MongoDB) is fully implemented and available in this repository, but it is not connected in the live Netlify demo due to hosting/database limitations.

🛠️ All backend routes (authentication, product management, cart, orders) are implemented and tested locally.

📸 Screenshots of the full-stack version (with backend and product data) are included in the repository.

👉 Live Demo (Frontend Only): https://smart-e-commerce.netlify.app/

👉 Full Code (Frontend + Backend): GitHub Repo
          </p>
          <Link to="/products" className="btn btn-success">Click Here => Browse Products</Link>
        </div>
        <h4>Featured</h4>
        <div className="row g-3">
          {products.map(p=> (
            <div className="col-sm-6 col-md-4" key={p.id}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
