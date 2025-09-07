import React, { createContext, useContext, useEffect, useState } from 'react'
import api from '../services'
import { useNavigate } from 'react-router-dom'
const AuthContext = createContext()
export function AuthProvider({ children }){
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('user')||'null') } catch { return null } })
  const navigate = useNavigate()
  async function login(email, password){ const res = await api.post('/api/auth/login', { email, password }); const { token, user } = res.data; localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); setUser(user); return res.data }
  async function register(name, email, password){ const res = await api.post('/api/auth/register', { name, email, password }); const { token, user } = res.data; localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); setUser(user); return res.data }
  function logout(){ localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); navigate('/') }
  return (<AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>)
}
export function useAuth(){ return useContext(AuthContext) }
