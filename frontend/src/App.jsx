import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ProductList from './pages/ProductList'
import ProductDetails from './pages/ProductDetails'
import Cart from './pages/Cart'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyOTP from './pages/VerifyOTP'
import Admin from './pages/Admin'
import Wishlist from './pages/Wishlist'
import OrderConfirmation from './pages/OrderConfirmation'
import InfoPage from './pages/InfoPage'
import Header from './components/Header'
import Footer from './components/Footer'
import { CartProvider } from './context/CartContext'
import { WishlistProvider } from './context/WishlistContext'

/* Bootstrap-grid pages (Login/Register/OTP/Admin) need a .container
   parent so their .row negative margins don't overflow. Home,
   ProductList, Cart and ProductDetails manage their own full-bleed
   layout, so they are rendered without the container. */
function Contained({ children }) {
  return <div className="container py-5">{children}</div>
}

export default function App() {
  return (
    <CartProvider>
      <WishlistProvider>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<ProductList />} />
            <Route path="/products/:id" element={<ProductDetails />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/order/:id" element={<OrderConfirmation />} />
            <Route path="/page/:slug" element={<InfoPage />} />
            <Route path="/verify-otp" element={<Contained><VerifyOTP /></Contained>} />
            <Route path="/login" element={<Contained><Login /></Contained>} />
            <Route path="/register" element={<Contained><Register /></Contained>} />
            <Route path="/admin" element={<Contained><Admin /></Contained>} />
          </Routes>
        </main>
        <Footer />
      </WishlistProvider>
    </CartProvider>
  )
}
