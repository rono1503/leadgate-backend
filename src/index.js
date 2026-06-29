require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const compression = require('compression')
const rateLimit = require('express-rate-limit')

const app = express()
const PORT = process.env.PORT || 3000

// Trust Railway proxy
app.set('trust proxy', 1)

// Security
app.use(helmet())
app.use(compression())
app.use(morgan('combined'))
app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false }))

// Rate limit — 60 req/min per IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
}))

// Routes
const leadsRoutes = require('./routes/leads.routes')
const partnersRoutes = require('./routes/partners.routes')
const callRoutes = require('./routes/call.routes')

// Debug endpoint
app.post('/api/debug/body', (req, res) => {
  console.log('[Debug] Headers:', JSON.stringify(req.headers))
  console.log('[Debug] Body:', JSON.stringify(req.body))
  res.json({ headers: req.headers, body: req.body })
})

app.use('/api', leadsRoutes)
app.use('/api', partnersRoutes)
app.use('/api/twilio', callRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'leadgate-backend', timestamp: new Date().toISOString() })
})

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('[LeadGate] Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`[LeadGate] Server running on port ${PORT}`)
  console.log(`[LeadGate] Admin passcode configured: ${!!process.env.ADMIN_PASSCODE}`)
})
