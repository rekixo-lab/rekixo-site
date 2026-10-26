-- REKIXO parent-site Cloudflare D1 schema, version 1.
-- Financial records are never marked paid based only on client data.
CREATE TABLE IF NOT EXISTS payment_orders (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT NOT NULL,
  business_name TEXT NOT NULL,
  amount_paise INTEGER NOT NULL CHECK (amount_paise = 100000),
  currency TEXT NOT NULL CHECK (currency = 'INR'),
  status TEXT NOT NULL DEFAULT 'created',
  payment_id TEXT UNIQUE,
  contact_id TEXT UNIQUE,
  refunded_paise INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TEXT,
  refunded_at TEXT
);
CREATE INDEX IF NOT EXISTS payment_orders_by_created ON payment_orders(created_at DESC);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  order_id TEXT UNIQUE REFERENCES payment_orders(id),
  client_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT NOT NULL,
  business_name TEXT NOT NULL,
  project_description TEXT NOT NULL,
  request_admin_mobile INTEGER NOT NULL DEFAULT 0,
  advance_booking INTEGER NOT NULL DEFAULT 0,
  payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  email_state TEXT NOT NULL DEFAULT 'pending',
  email_message_id TEXT,
  email_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS contacts_by_created ON contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS contacts_by_email_state ON contacts(email_state);

CREATE TABLE IF NOT EXISTS payment_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  order_id TEXT,
  payment_id TEXT,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  bucket TEXT PRIMARY KEY,
  hits INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS api_rate_limits_expiration ON api_rate_limits(expires_at);
