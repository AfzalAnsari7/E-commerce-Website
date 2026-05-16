import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services';
import ProductCard from '../components/ProductCard';
import "./productlist.styles.css";

const CATEGORIES = ["All", "Men", "Women", "Sneakers"];

const SUBTITLE = {
  All: "Explore the full Axen Wear range",
  Men: "Tees, jackets, hoodies, joggers & more",
  Women: "Dresses, tops, denim & everyday essentials",
  Sneakers: "Step up your game with fresh kicks",
};

const SORTS = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price: Low to High" },
  { key: "price-desc", label: "Price: High to Low" },
  { key: "name", label: "Name: A–Z" },
];

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [params, setParams] = useSearchParams();
  const [sort, setSort] = useState("featured");

  const category = params.get("category") || "All";
  const query = (params.get("q") || "").trim().toLowerCase();

  function load() {
    setStatus("loading");
    api.get('/api/products')
      .then(res => { setProducts(res.data); setStatus("ok"); })
      .catch(() => setStatus("error"));
  }

  useEffect(load, []);

  const filtered = useMemo(() => {
    let list = products.filter(p => {
      const matchCat =
        category === "All" ||
        (p.category || "").toLowerCase() === category.toLowerCase();
      const matchQ =
        !query ||
        p.title.toLowerCase().includes(query) ||
        (p.description || "").toLowerCase().includes(query);
      return matchCat && matchQ;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === "name") list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [products, category, query, sort]);

  function pickCategory(c) {
    const next = new URLSearchParams(params);
    if (c === "All") next.delete("category");
    else next.set("category", c);
    setParams(next);
  }

  const isSearch = !!query;
  const title = isSearch
    ? `Results for “${query}”`
    : category === "All" ? "All Products" : `${category}'s Collection`;
  const subtitle = isSearch
    ? `${filtered.length} item${filtered.length !== 1 ? "s" : ""} found`
    : SUBTITLE[category] || "";

  if (status === "loading") {
    return <div className="pl-state">Loading products…</div>;
  }
  if (status === "error") {
    return (
      <div className="pl-state">
        <h2>Couldn’t load products</h2>
        <p>We couldn’t reach the store. Please check your connection and try again.</p>
        <button className="pl-empty-btn" onClick={load}>Retry</button>
      </div>
    );
  }

  return (
    <div className="pl-page">
      {/* Banner */}
      <header className="pl-banner">
        <nav className="pl-crumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/products">Shop</Link>
          {category !== "All" && !isSearch && (
            <>
              <span>/</span>
              <em>{category}</em>
            </>
          )}
        </nav>
        <h1 className="pl-title">{title}</h1>
        <p className="pl-subtitle">{subtitle}</p>
      </header>

      {/* Toolbar */}
      <div className="pl-toolbar">
        <div className="pl-chips">
          {CATEGORIES.map(c => (
            <button
              key={c}
              className={`pl-chip ${category === c && !isSearch ? "active" : ""}`}
              onClick={() => pickCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="pl-toolbar-right">
          <span className="pl-count">
            {filtered.length} product{filtered.length !== 1 ? "s" : ""}
          </span>
          <label className="pl-sort">
            <span>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Grid */}
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
