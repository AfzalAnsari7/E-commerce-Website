import React from 'react'
import { useCart } from '../context/CartContext'
import api from '../services'
import { useAuth } from '../context/AuthContext'
export default function Cart(){
  const { cart, updateQty, removeFromCart, clearCart } = useCart()
  const { user } = useAuth()
  const total = cart.reduce((s,p)=>s+(p.price * p.qty), 0)
  async function placeOrder(){
    if(!user){ return alert('You must be logged in to place an order') }
    try { const res = await api.post('/api/orders', { items: cart }); alert('Order placed — id: ' + res.data.orderId); clearCart() } catch (err){ alert('Order failed, try again') }
  }
  if(cart.length===0) return <div><h3>Your cart is empty</h3></div>
  return (
    <div>
      <h3>Your Cart</h3>
      <table className="table"><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th></th></tr></thead>
        <tbody>{cart.map(p=> (<tr key={p.id}><td>{p.title}</td><td style={{width:120}}><input type="number" min="1" value={p.qty} className="form-control" onChange={(e)=> updateQty(p.id, parseInt(e.target.value||1))} /></td><td>₹{p.price * p.qty}</td><td><button className="btn btn-sm btn-outline-danger" onClick={()=> removeFromCart(p.id)}>Remove</button></td></tr>))}</tbody>
      </table>
      <div className="d-flex justify-content-between align-items-center"><strong>Total: ₹{total}</strong><div><button className="btn btn-secondary me-2" onClick={clearCart}>Clear</button><button className="btn btn-success" onClick={placeOrder}>Place Order</button></div></div>
    </div>
  )
}
