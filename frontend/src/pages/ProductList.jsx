import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services';
import ProductCard from '../components/ProductCard';
import demoProducts from '../data/product';
import "./productlist.styles.css";

const CATEGORIES = ["All", "Men", "Women", "Sneakers"];

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [params, setParams] = useSearchParams();

  const category = params.get("category") || "All";
  const query = (params.get("q") || "").trim().toLowerCase();

  useEffect(() => {
    api.get('/api/products')
      .then(res => setProducts(res.data))
      .catch(() => setProducts(demoProducts));
  }, []);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchCat =
        category === "All" ||
        (p.category || "").toLowerCase() === category.toLowerCase();
      const matchQ =
        !query ||
        p.title.toLowerCase().includes(query) ||
        (p.description || "").toLowerCase().includes(query);
      return matchCat && matchQ;
    });
  }, [products, category, query]);

  function pickCategory(c) {
    const next = new URLSearchParams(params);
    if (c === "All") next.delete("category");
    else next.set("category", c);
    setParams(next);
  }

  const heading = query
    ? `Results for “${query}”`
    : category === "All" ? "All Products" : category;

  return (
    <div className="product-list-page">
      <div className="pl-head">
        <h2 className="product-list-title">{heading}</h2>
        <p className="pl-count">{filtered.length} product{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="pl-filters">
        {CATEGORIES.map(c => (
          <button
            key={c}
            className={`pl-chip ${category === c ? "active" : ""}`}
            onClick={() => pickCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="pl-empty">
          <p>No products found{category !== "All" ? ` in ${category}` : ""}.</p>
          <Link to="/products" className="pl-empty-btn">View all products</Link>
        </div>
      ) : (
        <div className="product-grid">
          {filtered.map((p) => (
            <ProductCard product={p} key={p.id} />
          ))}
        </div>
      )}
    </div>
  );
}
