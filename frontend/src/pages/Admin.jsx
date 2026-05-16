import React, { useEffect, useState } from "react";
import api from "../services";
import { useAuth } from "../context/AuthContext";
import "./Admin.css";

const CATS = ["All", "Men", "Women", "Sneakers"];
const ALL_SIZES = ["S", "M", "L", "XL", "XXL"];

const EMPTY = {
  title: "", price: "", mrp: "", image: "",
  category: "Men", description: "", sizes: [...ALL_SIZES],
};

export default function Admin() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("All");
  const [form, setForm] = useState(EMPTY);          // add form
  const [editing, setEditing] = useState(null);     // product being edited
  const [editForm, setEditForm] = useState(EMPTY);

  function loadProducts() {
    api.get("/api/products").then((res) => setProducts(res.data)).catch(() => {});
  }
  useEffect(loadProducts, []);

  function toggleSize(state, setState, s) {
    setState({
      ...state,
      sizes: state.sizes.includes(s)
        ? state.sizes.filter((x) => x !== s)
        : [...state.sizes, s],
    });
  }

  async function addProduct(e) {
    e.preventDefault();
    try {
      const res = await api.post("/api/admin/products", {
        ...form, price: Number(form.price), mrp: Number(form.mrp) || 0,
      });
      alert("Product added: " + res.data.title);
      setForm(EMPTY);
      setProducts((prev) => [...prev, res.data]);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add");
    }
  }

  function openEdit(p) {
    setEditing(p);
    setEditForm({
      title: p.title || "",
      price: p.price ?? "",
      mrp: p.mrp ?? "",
      image: p.image || "",
      category: p.category || "Men",
      description: p.description || "",
      sizes: Array.isArray(p.sizes) && p.sizes.length ? p.sizes : [...ALL_SIZES],
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    try {
      const res = await api.put(`/api/admin/products/${editing.id}`, {
        ...editForm,
        price: Number(editForm.price),
        mrp: Number(editForm.mrp) || 0,
      });
      setProducts((prev) => prev.map((x) => (x.id === res.data.id ? res.data : x)));
      setEditing(null);
    } catch (err) {
      alert(err.response?.data?.message || "Update failed");
    }
  }

  async function deleteProduct(p) {
    if (!window.confirm(`Delete "${p.title}"?`)) return;
    try {
      await api.delete(`/api/admin/products/${p.id}`);
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  }

  async function deleteCategory(cat) {
    const count = products.filter((p) => p.category === cat).length;
    if (!count) return alert(`No products in ${cat}.`);
    if (!window.confirm(`Delete ALL ${count} products in "${cat}"? This cannot be undone.`)) return;
    try {
      const res = await api.delete(`/api/admin/products?category=${cat}`);
      setProducts((prev) => prev.filter((p) => p.category !== cat));
      alert(`Deleted ${res.data.count} products from ${cat}.`);
    } catch (err) {
      alert(err.response?.data?.message || "Bulk delete failed");
    }
  }

  if (!user || !user.isAdmin)
    return (
      <div className="text-center" style={{ padding: "80px 20px" }}>
        <h4>Access denied — admin only</h4>
        <p className="text-muted">Log in with an admin account to manage products.</p>
      </div>
    );

  const shown = filter === "All" ? products : products.filter((p) => p.category === filter);

  return (
    <div>
      <h3 className="mb-4">Admin Panel</h3>

      {/* Add product */}
      <div className="mb-5">
        <h5 className="mb-3">Add product</h5>
        <form onSubmit={addProduct}>
          <div className="row g-2">
            <div className="col-md-3">
              <input className="form-control" placeholder="Title" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="col-md-2">
              <input className="form-control" type="number" placeholder="Price ₹" value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div className="col-md-2">
              <input className="form-control" type="number" placeholder="MRP ₹ (optional)" value={form.mrp}
                onChange={(e) => setForm({ ...form, mrp: e.target.value })} />
            </div>
            <div className="col-md-2">
              <select className="form-control" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option>Men</option><option>Women</option><option>Sneakers</option>
              </select>
            </div>
            <div className="col-md-3">
              <input className="form-control" placeholder="Image URL" value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })} required />
            </div>
          </div>
          <div className="ad-sizes mt-2">
            <span>Sizes:</span>
            {ALL_SIZES.map((s) => (
              <label key={s} className={form.sizes.includes(s) ? "on" : ""}>
                <input type="checkbox" checked={form.sizes.includes(s)}
                  onChange={() => toggleSize(form, setForm, s)} />
                {s}
              </label>
            ))}
          </div>
          <div className="mt-2">
            <textarea className="form-control" placeholder="Description" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <button className="btn btn-primary mt-2 px-4">Add Product</button>
        </form>
      </div>

      {/* Manage */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3" style={{ gap: 12 }}>
        <h5 className="mb-0">Manage products ({shown.length})</h5>
        <div className="d-flex flex-wrap" style={{ gap: 8 }}>
          {CATS.map((c) => (
            <button key={c}
              className={`btn btn-sm ${filter === c ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setFilter(c)}>
              {c}
            </button>
          ))}
          {filter !== "All" && (
            <button className="btn btn-sm btn-danger" onClick={() => deleteCategory(filter)}>
              Delete all in {filter}
            </button>
          )}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="text-muted">No products{filter !== "All" ? ` in ${filter}` : ""}.</p>
      ) : (
        <div className="row g-3">
          {shown.map((p) => (
            <div className="col-sm-6 col-md-4 col-lg-3" key={p.id}>
              <div className="card h-100">
                <img src={p.image} className="card-img-top" alt={p.title}
                  style={{ height: 170, objectFit: "cover" }} />
                <div className="card-body d-flex flex-column">
                  <span className="badge bg-secondary align-self-start mb-2">{p.category}</span>
                  <h6 className="mb-1">{p.title}</h6>
                  <p className="mb-2">
                    ₹{p.price}{" "}
                    {Number(p.mrp) > p.price && (
                      <small className="text-muted text-decoration-line-through">₹{p.mrp}</small>
                    )}
                  </p>
                  <div className="d-flex gap-2 mt-auto">
                    <button className="btn btn-sm btn-dark flex-fill"
                      onClick={() => openEdit(p)}>Edit</button>
                    <button className="btn btn-sm btn-outline-danger flex-fill"
                      onClick={() => deleteProduct(p)}>Delete</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="ad-modal-overlay" onClick={() => setEditing(null)}>
          <form className="ad-modal" onClick={(e) => e.stopPropagation()} onSubmit={saveEdit}>
            <div className="ad-modal-head">
              <h5>Edit product</h5>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close">✕</button>
            </div>

            <div className="ad-modal-body">
              <img className="ad-preview" src={editForm.image} alt="preview"
                onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
                onLoad={(e) => { e.currentTarget.style.visibility = "visible"; }} />

              <label>Image URL</label>
              <input className="form-control" value={editForm.image}
                onChange={(e) => setEditForm({ ...editForm, image: e.target.value })} />

              <label>Title</label>
              <input className="form-control" value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />

              <div className="row g-2">
                <div className="col-6">
                  <label>Price ₹</label>
                  <input className="form-control" type="number" value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} required />
                </div>
                <div className="col-6">
                  <label>MRP ₹ (0 = no discount)</label>
                  <input className="form-control" type="number" value={editForm.mrp}
                    onChange={(e) => setEditForm({ ...editForm, mrp: e.target.value })} />
                </div>
              </div>

              <label>Category</label>
              <select className="form-control" value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
                <option>Men</option><option>Women</option><option>Sneakers</option>
              </select>

              <label>Available sizes</label>
              <div className="ad-sizes">
                {ALL_SIZES.map((s) => (
                  <label key={s} className={editForm.sizes.includes(s) ? "on" : ""}>
                    <input type="checkbox" checked={editForm.sizes.includes(s)}
                      onChange={() => toggleSize(editForm, setEditForm, s)} />
                    {s}
                  </label>
                ))}
              </div>

              <label>Description</label>
              <textarea className="form-control" value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />

              <p className="ad-note">
                Rating is calculated from real customer reviews and isn’t manually editable.
              </p>
            </div>

            <div className="ad-modal-foot">
              <button type="button" className="btn btn-outline-secondary"
                onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save changes</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
