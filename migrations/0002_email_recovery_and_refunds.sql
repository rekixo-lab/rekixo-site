-- D1 incremental migration: email-notification recovery and itemized refunds
ALTER TABLE contacts ADD COLUMN email_claimed_at TEXT;

CREATE TABLE IF NOT EXISTS payment_refunds (
  refund_id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0 AND amount_paise <= 100000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS payment_refunds_by_payment ON payment_refunds(payment_id);
