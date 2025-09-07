import React, { createContext, useContext, useEffect, useState } from 'react'
const CartContext = createContext()
export function CartProvider({ children }){
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart') || '[]') } catch { return [] }
  })
  useEffect(() => { localStorage.setItem('cart', JSON.stringify(cart)) }, [cart])
  function addToCart(product, qty=1){
    setCart(prev=>{ const found = prev.find(p=>p.id===product.id); if(found) return prev.map(p=> p.id===product.id ? {...p, qty: p.qty + qty} : p); return [...prev, {...product, qty}] })
  }
  function updateQty(id, qty){ setCart(prev => prev.map(p => p.id===id? {...p, qty} : p)) }
  function removeFromCart(id){ setCart(prev => prev.filter(p => p.id!==id)) }
  function clearCart(){ setCart([]) }
  return (<CartContext.Provider value={{ cart, addToCart, updateQty, removeFromCart, clearCart }}>{children}</CartContext.Provider>)
}
export function useCart(){ return useContext(CartContext) }
