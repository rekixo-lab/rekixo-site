// REKIXO parent website: Cloudflare-native Worker API + static assets.
// No Firebase dependency; Razorpay remains the external regulated payment processor.
const AMOUNT_PAISE = 100000;
const CURRENCY = "INR";
const encoder = new TextEncoder();

export function safeText(value, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}
export function bookingIdentity(data) {
  return {
    clientName: safeText(data.clientName, 120),
    mobile: safeText(data.mobile, 24),
    email: safeText(data.email, 120).toLowerCase(),
    businessName: safeText(data.businessName, 160)
  };
}
export function validateIdentity(info) {
  if (info.clientName.length < 2) return "Name is required";
  if (!/^\+?[0-9\s\-()]{8,24}$/.test(info.mobile)) return "Valid mobile number is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email)) return "Valid email is required";
  if (info.businessName.length < 2) return "Business name is required";
  return null;
}
export function sameBooking(order, info) {
  return order.client_name === info.clientName &&
    order.mobile === info.mobile &&
    order.email === info.email &&
    order.business_name === info.businessName;
}
export async function hmacHex(secret, data) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, typeof data === "string" ? encoder.encode(data) : data);
  return Array.from(new Uint8Array(signature), (v) => v.toString(16).padStart(2, "0")).join("");
}
export function equalHex(a, b) {
  if (!/^[a-f0-9]{64}$/i.test(String(a)) || !/^[a-f0-9]{64}$/i.test(String(b))) return false;
  let diff = 0;
  const left = String(a).toLowerCase();
  const right = String(b).toLowerCase();
  for (let i = 0; i < 64; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}
export async function verifyHmac(secret, message, claimed) {
  if (!secret || !claimed) return false;
  return equalHex(await hmacHex(secret, message), claimed);
}
function respond(body, status = 200) {
  return Response.json(body, { status, headers: {
    "Cache-Control": "no-store, private",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  } });
}
function reject(message, status = 400) { return respond({ error: message }, status); }
function dbRequired(env) {
  if (!env.DB || typeof env.DB.prepare !== "function") throw new Error("D1 binding DB missing");
  return env.DB;
}
async function inputJson(req) {
  const length = Number(req.headers.get("content-length") || 0);
  if (length > 12000 || !String(req.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    throw Object.assign(new Error("Expected JSON body under 12 KB"), { status: 415 });
  }
  const text = await req.text();
  if (encoder.encode(text).length > 12000) {
    throw Object.assign(new Error("Request body too large"), { status: 413 });
  }
  try {
    const object = JSON.parse(text);
    if (!object || Array.isArray(object) || typeof object !== "object") throw new Error("Invalid JSON");
    return object;
  } catch {
    throw Object.assign(new Error("Invalid JSON"), { status: 400 });
  }
}
function originAllowed(req) {
  const origin = req.headers.get("origin");
  return !origin || origin === new URL(req.url).origin;
}
async function rateLimit(env, req, route, max) {
  const db = dbRequired(env);
  if (!env.RATE_LIMIT_SALT) throw new Error("RATE_LIMIT_SALT secret missing");
  // Store only a salted fingerprint, never a customer's raw IP address.
  const ip = req.headers.get("cf-connecting-ip") || "unidentified";
  const minute = Math.floor(Date.now() / 60000);
  const key = await hmacHex(env.RATE_LIMIT_SALT, route + ":" + ip + ":" + minute);
  const now = Date.now();
  await db.prepare(
    "INSERT INTO api_rate_limits (bucket, hits, expires_at) VALUES (?, 1, ?) " +
    "ON CONFLICT(bucket) DO UPDATE SET hits = hits + 1"
  ).bind(key, now + 120000).run();
  const row = await db.prepare("SELECT hits FROM api_rate_limits WHERE bucket = ?").bind(key).first();
  return Number(row?.hits || 1) <= max;
}
async function razorpay(env, resource, method = "GET", data, fetcher = fetch) {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay API credentials missing");
  }
  if (!/^[a-z0-9_/-]+$/i.test(resource)) throw new Error("Invalid Razorpay resource");
  const auth = btoa(env.RAZORPAY_KEY_ID + ":" + env.RAZORPAY_KEY_SECRET);
  const response = await fetcher("https://api.razorpay.com/v1/" + resource, {
    method,
    headers: { "Authorization": "Basic " + auth, "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined
  });
  if (!response.ok) {
    console.error("Razorpay returned HTTP " + response.status + " for " + resource);
    throw Object.assign(new Error("Payment provider request failed"), { status: 502 });
  }
  return response.json();
}
function isCaptured(payment, orderId) {
  return payment && payment.order_id === orderId &&
    Number(payment.amount) === AMOUNT_PAISE &&
    String(payment.currency).toUpperCase() === CURRENCY &&
    payment.status === "captured";
}
async function paymentOrder(req, env) {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return reject("Payment setup incomplete", 503);
  if (!(await rateLimit(env, req, "payment-order", 5))) return reject("Too many requests", 429);
  const body = await inputJson(req);
  const info = bookingIdentity(body);
  const invalid = validateIdentity(info);
  if (invalid) return reject(invalid);
  const receipt = "rekixo_web_" + crypto.randomUUID().replaceAll("-", "").slice(0, 24);
  const result = await razorpay(env, "orders", "POST", {
    amount: AMOUNT_PAISE,
    currency: CURRENCY,
    receipt,
    notes: {
      source: "rekixo_website",
      purpose: "advance_booking_fast_service"
      // Do not send contact PII to payment-provider order notes.
    }
  });
  if (!result?.id || result.amount !== AMOUNT_PAISE || result.currency !== CURRENCY) {
    return reject("Invalid payment order response", 502);
  }
  await dbRequired(env).prepare(
    "INSERT INTO payment_orders (id, client_name, mobile, email, business_name, amount_paise, currency, status) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, 'created')"
  ).bind(result.id, info.clientName, info.mobile, info.email, info.businessName, AMOUNT_PAISE, CURRENCY).run();
  return respond({ key: env.RAZORPAY_KEY_ID, orderId: result.id, amount: AMOUNT_PAISE, currency: CURRENCY });
}
async function notifyContact(env, id) {
  const db = dbRequired(env);
  // Claim notification once to avoid duplicate email on replay/concurrency.
  const claim = await db.prepare(
    "UPDATE contacts SET email_state = 'sending', email_error = NULL, email_claimed_at = CURRENT_TIMESTAMP " +
    "WHERE id = ? AND (email_state IN ('pending', 'failed') OR " +
    "(email_state = 'sending' AND email_claimed_at < datetime('now','-15 minutes')))"
  ).bind(id).run();
  if (Number(claim.meta?.changes || 0) !== 1) return;
  const c = await db.prepare("SELECT * FROM contacts WHERE id = ?").bind(id).first();
  try {
    if (!env.EMAIL?.send || !env.REKIXO_TO_EMAIL || !env.REKIXO_FROM_EMAIL) {
      throw new Error("Cloudflare Email Service binding / verified sender not configured");
    }
    const message = [
      "New REKIXO parent website enquiry",
      "Request ID: " + c.id,
      "Name: " + c.client_name,
      "Mobile: " + c.mobile,
      "Email: " + c.email,
      "Business: " + c.business_name,
      "Description:\n" + c.project_description,
      "Request admin number: " + (c.request_admin_mobile ? "Yes" : "No"),
      "Fast service: " + (c.advance_booking ? "Yes, verified INR 1,000 captured payment" : "No"),
      "Razorpay order ID: " + (c.order_id || "-"),
      "Razorpay payment ID: " + (c.payment_id || "-")
    ].join("\n\n");
    const result = await env.EMAIL.send({
      to: env.REKIXO_TO_EMAIL,
      from: env.REKIXO_FROM_EMAIL,
      replyTo: c.email,
      subject: "REKIXO project request: " + c.id.slice(0, 12),
      text: message
    });
    await db.prepare(
      "UPDATE contacts SET email_state = 'sent', email_message_id = ?, email_error = NULL WHERE id = ?"
    ).bind(safeText(result?.messageId || "", 160), id).run();
  } catch (error) {
    console.error("Contact email delivery failed for request " + id + ": " + String(error?.code || "SEND_ERROR"));
    await db.prepare(
      "UPDATE contacts SET email_state = 'failed', email_error = ? WHERE id = ?"
    ).bind(safeText(error?.code || "Delivery unavailable", 120), id).run();
  }
}
async function contact(req, env) {
  if (!(await rateLimit(env, req, "contact", 8))) return reject("Too many requests", 429);
  const data = await inputJson(req);
  // Honeypot: acknowledge bots without storing or notifying.
  if (safeText(data.websiteExtra, 80)) return respond({ ok: true });
  const info = bookingIdentity(data);
  const invalid = validateIdentity(info);
  if (invalid) return reject(invalid);
  const projectDescription = safeText(data.projectDescription, 4000);
  if (projectDescription.length < 10) return reject("Project description is required");
  const wantsBooking = data.advanceBookingFastService === true;
  const wantsPhone = data.requestAdminMobile === true;
  const db = dbRequired(env);
  let id;
  if (wantsBooking) {
    const orderId = safeText(data.razorpayOrderId, 90);
    const paymentId = safeText(data.razorpayPaymentId, 90);
    const signature = safeText(data.razorpaySignature, 150);
    if (!orderId || !paymentId || !signature) return reject("Payment details missing");
    const order = await db.prepare("SELECT * FROM payment_orders WHERE id = ?").bind(orderId).first();
    if (!order || order.amount_paise !== AMOUNT_PAISE || order.currency !== CURRENCY) {
      return reject("Matching payment order not found", 400);
    }
    if (!sameBooking(order, info)) return reject("Payment order does not match this booking", 409);
    if (!(await verifyHmac(env.RAZORPAY_KEY_SECRET, orderId + "|" + paymentId, signature))) {
      return reject("Payment signature invalid", 403);
    }
    const payment = await razorpay(env, "payments/" + encodeURIComponent(paymentId));
    if (!isCaptured(payment, orderId)) {
      return reject("Payment is not captured yet. Retry submitting this request without paying again.", 409);
    }
    if (order.payment_id && order.payment_id !== paymentId) {
      return reject("Payment order is linked to a different payment", 409);
    }
    id = "booking_" + orderId;
    // A transaction-like D1 batch: no duplicate booking if checkout callback replays.
    await db.batch([
      db.prepare(
        "INSERT OR IGNORE INTO contacts " +
        "(id, order_id, client_name, mobile, email, business_name, project_description, " +
        "request_admin_mobile, advance_booking, payment_id, status, email_state) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'new', 'pending')"
      ).bind(id, orderId, info.clientName, info.mobile, info.email, info.businessName,
        projectDescription, Number(wantsPhone), paymentId),
      db.prepare(
        "UPDATE payment_orders SET payment_id = ?, status = 'captured', " +
        "paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP), contact_id = ? " +
        "WHERE id = ? AND (payment_id IS NULL OR payment_id = ?) AND (contact_id IS NULL OR contact_id = ?)"
      ).bind(paymentId, id, orderId, paymentId, id)
    ]);
    const stored = await db.prepare("SELECT payment_id FROM contacts WHERE id = ?").bind(id).first();
    if (!stored || stored.payment_id !== paymentId) return reject("Booking was already processed differently", 409);
  } else {
    id = crypto.randomUUID();
    await db.prepare(
      "INSERT INTO contacts " +
      "(id, client_name, mobile, email, business_name, project_description, request_admin_mobile, " +
      "advance_booking, status, email_state) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'new', 'pending')"
    ).bind(id, info.clientName, info.mobile, info.email, info.businessName, projectDescription, Number(wantsPhone)).run();
  }
  await notifyContact(env, id);
  return respond({ ok: true, requestId: id });
}
async function webhook(req, env) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return reject("Webhook not configured", 503);
  const raw = await req.arrayBuffer();
  if (raw.byteLength > 200000) return reject("Webhook too large", 413);
  const signature = req.headers.get("x-razorpay-signature");
  if (!(await verifyHmac(env.RAZORPAY_WEBHOOK_SECRET, raw, signature))) {
    return reject("Invalid signature", 401);
  }
  const event = JSON.parse(new TextDecoder().decode(raw));
  const eventId = safeText(req.headers.get("x-razorpay-event-id") || await hmacHex(env.RAZORPAY_WEBHOOK_SECRET, raw), 160);
  const eventType = safeText(event.event, 80);
  const payment = event?.payload?.payment?.entity;
  const refund = event?.payload?.refund?.entity;
  const db = dbRequired(env);
  const seen = await db.prepare("SELECT event_id FROM payment_events WHERE event_id = ?").bind(eventId).first();
  if (seen) return respond({ ok: true });
  let orderId = null;
  let paymentId = null;
  if (eventType === "payment.captured" && payment) {
    orderId = safeText(payment.order_id, 90);
    paymentId = safeText(payment.id, 90);
    if (isCaptured(payment, orderId)) {
      await db.prepare(
        "UPDATE payment_orders SET status = 'captured', payment_id = ?, paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP) " +
        "WHERE id = ? AND amount_paise = ? AND currency = ? " +
        "AND (payment_id IS NULL OR payment_id = ?) AND status NOT IN (\'refunded\', \'partially_refunded\')"
      ).bind(paymentId, orderId, AMOUNT_PAISE, CURRENCY, paymentId).run();
    }
  }
  if ((eventType === "refund.processed" || eventType === "payment.refunded") && (refund || payment)) {
    paymentId = safeText(refund?.payment_id || payment?.id, 90);
    const refundId = safeText(refund?.id, 100);
    const amount = Number(refund?.amount || payment?.amount_refunded || 0);
    if (paymentId && Number.isInteger(amount) && amount > 0 && amount <= AMOUNT_PAISE) {
      if (eventType === "refund.processed" && refundId) {
        await db.prepare(
          "INSERT OR IGNORE INTO payment_refunds (refund_id, payment_id, amount_paise) VALUES (?, ?, ?)"
        ).bind(refundId, paymentId, amount).run();
      }
      const totals = await db.prepare(
        "SELECT COALESCE(SUM(amount_paise), 0) AS amount FROM payment_refunds WHERE payment_id = ?"
      ).bind(paymentId).first();
      const totalRefunded = Math.min(AMOUNT_PAISE, Math.max(Number(totals?.amount || 0),
        eventType === "payment.refunded" ? amount : 0));
      if (totalRefunded > 0) {
        await db.prepare(
          "UPDATE payment_orders SET refunded_paise = MAX(refunded_paise, ?), " +
          "status = CASE WHEN MAX(refunded_paise, ?) >= ? THEN 'refunded' ELSE 'partially_refunded' END, " +
          "refunded_at = CURRENT_TIMESTAMP WHERE payment_id = ?"
        ).bind(totalRefunded, totalRefunded, AMOUNT_PAISE, paymentId).run();
      }
    }
  }
  await db.prepare(
    "INSERT OR IGNORE INTO payment_events (event_id, event_type, order_id, payment_id) VALUES (?, ?, ?, ?)"
  ).bind(eventId, eventType, orderId, paymentId).run();
  return respond({ ok: true });
}
async function admin(req, env, path) {
  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 32) return reject("Admin API not configured", 503);
  const token = req.headers.get("authorization") || "";
  const secretHash = await hmacHex(env.ADMIN_TOKEN, "rekixo-admin");
  const supplied = token.startsWith("Bearer ") ? token.slice(7) : "";
  // Compare fixed-size HMAC digests so secret length does not leak.
  if (!supplied || !(await equalHex(secretHash, await hmacHex(supplied, "rekixo-admin")))) {
    return reject("Unauthorized", 401);
  }
  const db = dbRequired(env);
  if (req.method === "GET" && path === "/api/admin/contacts") {
    const limit = Math.min(50, Math.max(1, Number(new URL(req.url).searchParams.get("limit")) || 20));
    const rows = await db.prepare(
      "SELECT id, order_id, client_name, mobile, email, business_name, project_description, " +
      "request_admin_mobile, advance_booking, payment_id, email_state, status, created_at " +
      "FROM contacts ORDER BY created_at DESC LIMIT ?"
    ).bind(limit).all();
    return respond({ ok: true, contacts: rows.results || [] });
  }
  const resend = path.match(/^\/api\/admin\/contacts\/([a-zA-Z0-9_-]+)\/resend$/);
  if (req.method === "POST" && resend) {
    const row = await db.prepare("SELECT id, email_state FROM contacts WHERE id = ?").bind(resend[1]).first();
    if (!row) return reject("Not found", 404);
    if (row.email_state === "sent") return respond({ ok: true, alreadySent: true });
    if (row.email_state === "sending") {
      const stale = await db.prepare("SELECT email_claimed_at FROM contacts WHERE id = ?").bind(resend[1]).first();
      if (!stale?.email_claimed_at || Date.now() - new Date(stale.email_claimed_at.replace(" ", "T") + "Z").getTime() < 900000) {
        return reject("Notification already in progress", 409);
      }
    }
    await notifyContact(env, resend[1]);
    return respond({ ok: true });
  }
  return reject("Not found", 404);
}
export async function handleRequest(request, env) {
  const path = new URL(request.url).pathname;
  try {
    if (path === "/api/health" && request.method === "GET") {
      await dbRequired(env).prepare("SELECT 1").first();
      return respond({ ok: true, platform: "cloudflare", database: "ready", emailConfigured: Boolean(env.EMAIL && env.REKIXO_FROM_EMAIL && env.REKIXO_TO_EMAIL) });
    }
    if (path.startsWith("/api/admin/")) return await admin(request, env, path);
    if (path === "/api/payment/webhook" && request.method === "POST") return await webhook(request, env);
    if ((path === "/api/payment/order" || path === "/api/contact") && request.method === "POST") {
      if (!originAllowed(request)) return reject("Cross-origin requests are not permitted", 403);
      if (path === "/api/payment/order") return await paymentOrder(request, env);
      return await contact(request, env);
    }
    return reject("Not found", 404);
  } catch (error) {
    console.error("REKIXO API failure at " + path + ": " + String(error?.message || "unknown error"));
    return reject(error?.status >= 400 && error?.status < 500 ? error.message : "Service temporarily unavailable",
      error?.status >= 400 && error?.status < 500 ? error.status : 503);
  }
}
export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith("/api/")) return handleRequest(request, env);
    return env.ASSETS.fetch(request);
  },
  async scheduled(_event, env) {
    // Expired request counters only. Never delete payment or enquiry records automatically.
    await dbRequired(env).prepare("DELETE FROM api_rate_limits WHERE expires_at < ?").bind(Date.now()).run();
  }
};
