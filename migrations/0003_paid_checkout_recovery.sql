-- Preserve paid booking details in Cloudflare D1 before redirecting to Razorpay.
-- This lets the signed payment.captured webhook restore the customer enquiry
-- even when a mobile browser closes before the checkout callback.
ALTER TABLE payment_orders ADD COLUMN project_description TEXT;
ALTER TABLE payment_orders ADD COLUMN request_admin_mobile INTEGER NOT NULL DEFAULT 0;
