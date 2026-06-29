const express = require('express')
const router = express.Router()
const { supabaseAdmin } = require('../config/supabase')

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'leadgate2026'

function requireAdmin(req, res, next) {
  const passcode = req.headers['x-admin-passcode']
  if (!passcode || passcode !== ADMIN_PASSCODE) {
    return res.status(401).json({ error: 'Unauthorized — invalid passcode' })
  }
  next()
}

/**
 * GET /api/partners
 * Admin — returns active partners.
 */
router.get('/partners', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('leadgate_partners')
      .select('id, name, slug, category, city, state, phone, twilio_number, is_active')
      .order('name')

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    console.error('[LeadGate] Fetch partners error:', err.message)
    res.status(500).json({ error: 'Failed to fetch partners' })
  }
})

module.exports = router
