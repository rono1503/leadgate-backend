-- Add twilio_number column to leadgate_partners for per-partner call tracking
ALTER TABLE leadgate_partners
ADD COLUMN IF NOT EXISTS twilio_number TEXT UNIQUE;

-- Index for fast lookups by twilio_number
CREATE INDEX IF NOT EXISTS idx_leadgate_partners_twilio_number
ON leadgate_partners (twilio_number);

-- Update the partners route to include twilio_number
