import React, { useEffect, useState } from "react";
import api from "../services";
import ProductCard from "../components/ProductCard";
import { Link } from "react-router-dom";


export default function Home() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api
      .get("/api/products")
      .then((res) => setProducts(res.data.slice(0, 6)))
      .catch(() => {});
  }, []);

  return (
    <div>
      <div>
        <h1>Hii,</h1>
        <h1>Welcome to E‑Shop</h1>
      </div>
      {/* <h4>Featured</h4> */}
      <div className="row g-3">
        {products.map((p) => (
          <div className="col-sm-6 col-md-4" key={p.id}>
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
