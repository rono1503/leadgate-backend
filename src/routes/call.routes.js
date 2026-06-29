const express = require('express')
const router = express.Router()
const VoiceResponse = require('twilio').twiml.VoiceResponse
const { supabaseAdmin } = require('../config/supabase')

/**
 * GET /api/twilio/voice
 * Twilio Voice webhook — inbound call handler.
 *
 * Flow:
 * 1. Caller dials the LeadGate Twilio number
 * 2. Twilio sends a POST to this webhook
 * 3. We look up the partner by the called number (or ask via menu)
 * 4. We forward the call and log it as a lead
 */

// ─── Shared Twilio number with partner menu ───
router.post('/voice', async (req, res) => {
  const twiml = new VoiceResponse()
  const callerNumber = req.body.From || 'unknown'
  const calledNumber = req.body.To || ''

  console.log(`[LeadGate] Inbound call from ${callerNumber} to ${calledNumber}`)

  // Fetch active partners for the menu
  const { data: partners, error } = await supabaseAdmin
    .from('leadgate_partners')
    .select('id, name, phone')
    .eq('is_active', true)
    .order('name')

  if (error || !partners || partners.length === 0) {
    console.error('[LeadGate] No active partners for call routing:', error?.message)
    twiml.say('Sorry, no partners are available right now. Please try again later.')
    twiml.hangup()
    return res.type('text/xml').send(twiml.toString())
  }

  if (partners.length === 1) {
    // Only one partner — route directly
    const partner = partners[0]
    console.log(`[LeadGate] Routing call from ${callerNumber} → ${partner.name} (${partner.phone})`)

    // Log the call as a lead
    await supabaseAdmin
      .from('leadgate_leads')
      .insert({
        partner_id: partner.id,
        source: 'phone-call',
        name: 'Phone Lead',
        phone: callerNumber,
        description: `Inbound call from ${callerNumber}`,
        status: 'new',
      })

    // Forward the call
    const dial = twiml.dial({ callerId: calledNumber })
    dial.number(partner.phone)
  } else {
    // Multiple partners — play a menu
    let menuText = 'Welcome to LeadGate. '

    partners.forEach((p, i) => {
      menuText += `Press ${i + 1} for ${p.name}. `
    })

    twiml.gather({
      numDigits: 1,
      action: '/api/twilio/voice-menu',
      method: 'POST',
      timeout: 10,
    }, (gatherNode) => {
      gatherNode.say(menuText)
    })

    // If no input, say goodbye
    twiml.say('No option selected. Goodbye.')
    twiml.hangup()
  }

  res.type('text/xml').send(twiml.toString())
})

/**
 * POST /api/twilio/voice-menu
 * Handles DTMF selection from the menu.
 */
router.post('/voice-menu', async (req, res) => {
  const twiml = new VoiceResponse()
  const digit = req.body.Digits
  const callerNumber = req.body.From || 'unknown'

  // Fetch partners again
  const { data: partners } = await supabaseAdmin
    .from('leadgate_partners')
    .select('id, name, phone')
    .eq('is_active', true)
    .order('name')

  const index = parseInt(digit) - 1
  const partner = partners?.[index]

  if (!partner) {
    twiml.say('Invalid selection. Goodbye.')
    twiml.hangup()
    return res.type('text/xml').send(twiml.toString())
  }

  console.log(`[LeadGate] Caller ${callerNumber} selected ${partner.name} (option ${digit})`)

  // Log the call as a lead
  await supabaseAdmin
    .from('leadgate_leads')
    .insert({
      partner_id: partner.id,
      source: 'phone-call',
      name: 'Phone Lead',
      phone: callerNumber,
      description: `Inbound call from ${callerNumber} → routed to ${partner.name}`,
      status: 'new',
    })

  // Forward the call
  twiml.say(`Connecting you to ${partner.name}.`)
  const dial = twiml.dial({ callerId: req.body.To || '' })
  dial.number(partner.phone)

  res.type('text/xml').send(twiml.toString())
})

module.exports = router
