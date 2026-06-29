const express = require('express')
const router = express.Router()
const VoiceResponse = require('twilio').twiml.VoiceResponse
const { supabaseAdmin } = require('../config/supabase')

/**
 * POST /api/twilio/voice
 * Twilio Voice webhook — routes calls based on which number was dialed.
 *
 * Each partner gets their own tracking number. When someone calls,
 * we look up the partner by the called number, forward the call,
 * and log it as a lead.
 */
router.post('/voice', async (req, res) => {
  const twiml = new VoiceResponse()
  const callerNumber = req.body.From || 'unknown'
  const calledNumber = req.body.To || ''

  console.log(`[LeadGate] Inbound call from ${callerNumber} to ${calledNumber}`)

  // Look up partner by their Twilio tracking number
  const { data: partners, error } = await supabaseAdmin
    .from('leadgate_partners')
    .select('id, name, phone')
    .eq('twilio_number', calledNumber)
    .eq('is_active', true)
    .limit(1)

  if (error) {
    console.error('[LeadGate] Partner lookup error:', error.message)
  }

  const partner = partners?.[0]

  if (!partner) {
    console.log(`[LeadGate] No partner found for number ${calledNumber}`)
    twiml.say('Thank you for calling LeadGate. Please try your call again or contact the business directly.')
    twiml.hangup()
    return res.type('text/xml').send(twiml.toString())
  }

  console.log(`[LeadGate] Routing call from ${callerNumber} → ${partner.name} (${partner.phone})`)

  // Log the lead
  const { error: leadError } = await supabaseAdmin
    .from('leadgate_leads')
    .insert({
      partner_id: partner.id,
      source: 'phone-call',
      name: 'Phone Lead',
      phone: callerNumber,
      description: `Inbound call from ${callerNumber} → routed to ${partner.name}`,
      status: 'new',
    })

  if (leadError) {
    console.error('[LeadGate] Failed to log lead:', leadError.message)
  }

  // Forward the call
  twiml.say(`Connecting you to ${partner.name}.`)
  const dial = twiml.dial({ callerId: calledNumber })
  dial.number(partner.phone)

  res.type('text/xml').send(twiml.toString())
})

module.exports = router
