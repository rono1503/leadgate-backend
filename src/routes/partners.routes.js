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

/**
 * PATCH /api/partners/:id
 * Admin — update partner fields (e.g. twilio_number).
 */
router.patch('/partners/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body
    // Only allow updating specific columns
    const allowed = ['twilio_number', 'phone', 'name', 'slug', 'is_active', 'city', 'state']
    const clean = {}
    for (const key of allowed) {
      if (updates[key] !== undefined) clean[key] = updates[key]
    }
    if (Object.keys(clean).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }
    const { data, error } = await supabaseAdmin
      .from('leadgate_partners')
      .update(clean)
      .eq('id', id)
      .select()
    if (error) throw error
    res.json(data?.[0] || {})
  } catch (err) {
    console.error('[LeadGate] Update partner error:', err.message)
    res.status(500).json({ error: 'Failed to update partner' })
  }
})

module.exports = router
