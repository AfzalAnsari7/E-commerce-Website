const express = require('express')
const cors = require('cors')
const { nanoid } = require('nanoid')
const fs = require('fs')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const path = require('path')

const productsFile = path.join(__dirname, 'data', 'products.json')
const usersFile = path.join(__dirname, 'data', 'users.json')

const app = express()
const PORT = process.env.PORT || 5000
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret'

app.use(cors())
app.use(express.json())

function readJSON(file){ return JSON.parse(fs.readFileSync(file)) }
function writeJSON(file, data){ fs.writeFileSync(file, JSON.stringify(data, null, 2)) }

app.get('/api/products', (req, res) => {
  const products = readJSON(productsFile)
  res.json(products)
})

app.get('/api/products/:id', (req, res) => {
  const products = readJSON(productsFile)
  const p = products.find(x => x.id === req.params.id)
  if(!p) return res.status(404).json({ message: 'Not found' })
  res.json(p)
})

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {}
  if(!name || !email || !password) return res.status(400).json({ message: 'Missing fields' })
  const users = readJSON(usersFile)
  if(users.find(u=>u.email===email)) return res.status(400).json({ message: 'Email already exists' })
  const hashed = bcrypt.hashSync(password, 8)
  const newUser = { id: nanoid(8), name, email, password: hashed, isAdmin: false }
  users.push(newUser)
  writeJSON(usersFile, users)
  const token = jwt.sign({ id: newUser.id, email: newUser.email, isAdmin: newUser.isAdmin }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email, isAdmin: newUser.isAdmin } })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {}
  if(!email || !password) return res.status(400).json({ message: 'Missing fields' })
  const users = readJSON(usersFile)
  const user = users.find(u=>u.email===email)
  if(!user) return res.status(400).json({ message: 'Invalid credentials' })
  const ok = bcrypt.compareSync(password, user.password)
  if(!ok) return res.status(400).json({ message: 'Invalid credentials' })
  const token = jwt.sign({ id: user.id, email: user.email, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin } })
})

function authMiddleware(req, res, next){
  const auth = req.headers.authorization
  if(!auth) return res.status(401).json({ message: 'Unauthorized' })
  const token = auth.split(' ')[1]
  try { const payload = jwt.verify(token, JWT_SECRET); req.user = payload; next() } catch (err){ return res.status(401).json({ message: 'Invalid token' }) }
}

app.post('/api/admin/products', authMiddleware, (req, res) => {
  if(!req.user.isAdmin) return res.status(403).json({ message: 'Forbidden' })
  const { title, price, image, description } = req.body || {}
  if(!title || !price) return res.status(400).json({ message: 'Missing fields' })
  const products = readJSON(productsFile)
  const id = nanoid(8)
  const newProduct = { id, title, price, image: image || 'https://picsum.photos/600/400', description: description || '' }
  products.push(newProduct); writeJSON(productsFile, products)
  res.json(newProduct)
})

app.post('/api/orders', authMiddleware, (req, res) => {
  const { items } = req.body || {}
  if(!items || !Array.isArray(items)) return res.status(400).json({ message: 'Invalid order' })
  const orderId = nanoid(10)
  res.json({ orderId, itemsCount: items.length })
})

app.listen(PORT, ()=> console.log('Server running on', PORT))
