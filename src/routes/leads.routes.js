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
 * POST /api/leads
 * Public — lead capture from partner landing pages.
 */
router.post('/leads', async (req, res) => {
  try {
    const partner_id = req.body.partner_id || req.headers['x-partner-id']
    if (!partner_id) {
      return res.status(400).json({ error: 'partner_id is required (body or X-Partner-ID header)' })
    }

    const { name, phone, email, address, city, state, zip, service_type, description, property_type, preference, source, utm_source, utm_medium, utm_campaign } = req.body

    if (!name || !phone) {
      return res.status(400).json({ error: 'name and phone are required' })
    }

    const { data, error } = await supabaseAdmin
      .from('leadgate_leads')
      .insert({
        partner_id,
        source: source || 'web-form',
        name, phone, email, address, city, state, zip,
        service_type, description, property_type, preference,
        source_url: req.headers.referer || null,
        utm_source, utm_medium, utm_campaign,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || null,
      })
      .select()
      .single()

    if (error) throw error

    console.log(`[LeadGate] Lead captured — ${partner_id}: ${name} (${phone})`)

    res.status(201).json({
      success: true,
      id: data.id,
      message: 'Thanks! We\'ll be in touch shortly.',
    })
  } catch (err) {
    console.error('[LeadGate] Lead capture error:', err.message)
    res.status(500).json({ error: 'Failed to save lead' })
  }
})

/**
 * GET /api/leads
 * Admin — returns all leads, optionally filtered.
 */
router.get('/leads', requireAdmin, async (req, res) => {
  try {
    const { partner_id, status, limit } = req.query

    let query = supabaseAdmin
      .from('leadgate_leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (partner_id) query = query.eq('partner_id', partner_id)
    if (status) query = query.eq('status', status)
    if (limit) query = query.limit(parseInt(limit))

    const { data, error } = await query
    if (error) throw error

    res.json(data || [])
  } catch (err) {
    console.error('[LeadGate] Fetch leads error:', err.message)
    res.status(500).json({ error: 'Failed to fetch leads' })
  }
})

/**
 * PATCH /api/leads/:id/status
 * Admin — update lead status.
 */
router.patch('/leads/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body
    const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'lost']

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` })
    }

    const { data, error } = await supabaseAdmin
      .from('leadgate_leads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error
    res.json({ success: true, lead: data })
  } catch (err) {
    console.error('[LeadGate] Update lead status error:', err.message)
    res.status(500).json({ error: 'Failed to update lead' })
  }
})

module.exports = router
