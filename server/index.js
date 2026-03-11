import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import itemRoutes from './routes/items.js'
import messageRoutes from './routes/messages.js'
import adminRoutes from './routes/admin.js'
import sessionRoutes from './routes/session.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' })) // 10mb for base64 images

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'FaithGuard API',
    timestamp: new Date().toISOString(),
  })
})

// API Routes
app.use('/api/session', sessionRoutes)
app.use('/api/items', itemRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/admin', adminRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Start server
app.listen(PORT, () => {
  console.log(`🛕 FaithGuard API running on port ${PORT}`)
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`)
})
