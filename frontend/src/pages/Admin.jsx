import React, { useEffect, useState } from "react";
import api from "../services";
import { useAuth } from "../context/AuthContext";



export default function Admin() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  useEffect(() => {
    api
      .get("/api/products")
      .then((res) => setProducts(res.data))
      .catch(() => {});
  }, []);
  async function addProduct(e) {
    e.preventDefault();
    try {
      const res = await api.post("/api/admin/products", {
        title,
        price: Number(price),
        image,
        description,
      });
      alert("Product added: " + res.data.id);
      setTitle("");
      setPrice("");
      setImage("");
      setDescription("");
      setProducts((prev) => [...prev, res.data]);
    } catch (err) {
      alert(err.response?.data?.message || "Failed");
    }
  }
  if (!user || !user.isAdmin)
    return (
      <div>
        <h4>Access denied — admin only</h4>
      </div>
    );
  return (
    <div>
      <h3>Admin Panel</h3>
      <div className="mb-4">
        <h5>Add product</h5>
        <form onSubmit={addProduct}>
          <div className="row g-2">
            <div className="col-md-3">
              <input
                className="form-control"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="Price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Image URL"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                required
              />
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary w-100">Add</button>
            </div>
          </div>
          <div className="mt-2">
            <textarea
              className="form-control"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>
        </form>
      </div>
      <h5>Existing products</h5>
      <div className="row g-3">
        {products.map((p) => (
          <div className="col-sm-6 col-md-4" key={p.id}>
            <div className="card">
              <img
                src={p.image}
                className="card-img-top"
                style={{ height: 160, objectFit: "cover" }}
              />
              <div className="card-body">
                <h6>{p.title}</h6>
                <p className="mb-0">₹{p.price}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
