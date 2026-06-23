-- LeadGate — Tables for managed lead generation platform
-- Run this in Supabase SQL Editor before starting the backend

-- Partners table — each client business
CREATE TABLE IF NOT EXISTS leadgate_partners (
  id            TEXT PRIMARY KEY,                -- e.g. 'phoenix-smart-connect', 'ct-hvac'
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  category      TEXT,                            -- security, hvac, plumbing, etc.
  city          TEXT,
  state         TEXT,
  phone         TEXT,
  website       TEXT,
  logo_url      TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Leads table — all incoming leads
CREATE TABLE IF NOT EXISTS leadgate_leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    TEXT NOT NULL REFERENCES leadgate_partners(id),

  -- Source
  source        TEXT DEFAULT 'web-form',         -- web-form, phone, referral

  -- Lead contact
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT,
  address       TEXT,
  city          TEXT,
  state         TEXT,
  zip           TEXT,

  -- Service details
  service_type  TEXT,
  description   TEXT,
  property_type TEXT,
  preference    TEXT,                            -- preferred contact time/day

  -- Status
  status        TEXT DEFAULT 'new' NOT NULL,      -- new, contacted, qualified, converted, lost
  notes         TEXT,

  -- Attribution
  source_url    TEXT,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  ip_address    TEXT,
  user_agent    TEXT,

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_partner ON leadgate_leads(partner_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leadgate_leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leadgate_leads(created_at DESC);

-- Seed partners
INSERT INTO leadgate_partners (id, name, slug, category, city, state, phone)
VALUES
  ('phoenix-smart-connect', 'Phoenix Smart Connect', 'phoenix-smart-connect', 'security', 'East Orange', 'NJ', '(973) 932-4914'),
  ('waterbury-hvac', 'Waterbury HVAC Partner', 'waterbury-hvac', 'hvac', 'Waterbury', 'CT', null)
ON CONFLICT (id) DO NOTHING;
