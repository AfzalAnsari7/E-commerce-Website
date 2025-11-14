import React, { useEffect, useState } from 'react';
import api from '../services';
import ProductCard from '../components/ProductCard';
import demoProducts from '../data/product';
import "./productlist.styles.css";

export default function ProductList() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get('/api/products')
      .then(res => setProducts(res.data))
      .catch(() => setProducts(demoProducts));
  }, []);

  return (
    <div className="product-list-page">

      <h2 className="product-list-title">All Products</h2>

      <div className="product-grid">
        {products.map((p) => (
          <div key={p.id}>
            <ProductCard product={p} />
          </div>
        ))}
      </div>
      
    </div>
  );
}
