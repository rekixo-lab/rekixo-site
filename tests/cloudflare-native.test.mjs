import test from "node:test";
import assert from "node:assert/strict";
import { hmacHex, verifyHmac, equalHex, bookingIdentity, validateIdentity, sameBooking, handleRequest } from "../worker/index.js";

const key = "test-razorpay-secret";
const person = { clientName: "Test Owner", mobile: "+919876543210", email: "owner@example.com", businessName: "Example Company" };
function request(path, data, extraHeaders = {}) {
  return new Request("https://rekixo.com" + path, {
    method: "POST", headers: { "content-type": "application/json", origin: "https://rekixo.com", ...extraHeaders },
    body: JSON.stringify(data)
  });
}
class MockDB {
  constructor() {
    this.orders = new Map();
    this.contacts = new Map();
    this.rates = new Map();
    this.events = new Map();
    this.refunds = new Map();
  }
  prepare(sql) {
    const self = this;
    let values = [];
    const stmt = {
      bind(...args) { values = args; return this; },
      async first() {
        if (sql === "SELECT 1") return { "1": 1 };
        if (sql.includes("SELECT hits FROM api_rate_limits")) return { hits: self.rates.get(values[0]) || 0 };
        if (sql.includes("SELECT * FROM payment_orders")) return self.orders.get(values[0]) || null;
        if (sql.includes("SELECT payment_id FROM contacts")) {
          const c = self.contacts.get(values[0]); return c ? { payment_id: c.payment_id } : null;
        }
        if (sql.includes("SELECT * FROM contacts")) return self.contacts.get(values[0]) || null;
        if (sql.includes("SELECT COALESCE(SUM(amount_paise), 0) AS amount")) {
          const sum = [...self.refunds.values()].filter((r) => r.payment_id === values[0])
            .reduce((acc, r) => acc + r.amount_paise, 0);
          return { amount: sum };
        }
        if (sql.includes("SELECT event_id FROM payment_events")) return self.events.has(values[0]) ? { event_id: values[0] } : null;
        if (sql.includes("SELECT id, email_state FROM contacts")) {
          const c = self.contacts.get(values[0]); return c ? { id: c.id, email_state: c.email_state } : null;
        }
        throw new Error("Unhandled SELECT " + sql);
      },
      async run() {
        if (sql.startsWith("INSERT INTO api_rate_limits")) {
          const [bucket] = values; self.rates.set(bucket, (self.rates.get(bucket) || 0) + 1);
          return { meta: { changes: 1 } };
        }
        if (sql.startsWith("INSERT INTO payment_orders")) {
          const [id, client_name, mobile, email, business_name, amount_paise, currency] = values;
          self.orders.set(id, { id, client_name, mobile, email, business_name, amount_paise, currency, payment_id: null, contact_id: null, status: "created" });
          return { meta: { changes: 1 } };
        }
        if (sql.startsWith("INSERT OR IGNORE INTO contacts")) {
          const [id, order_id, client_name, mobile, email, business_name, project_description, request_admin_mobile, payment_id] = values;
          if (self.contacts.has(id)) return { meta: { changes: 0 } };
          self.contacts.set(id, { id, order_id, client_name, mobile, email, business_name, project_description, request_admin_mobile, payment_id, advance_booking: 1, email_state: "pending" });
          return { meta: { changes: 1 } };
        }
        if (sql.startsWith("INSERT INTO contacts")) {
          const [id, client_name, mobile, email, business_name, project_description, request_admin_mobile] = values;
          self.contacts.set(id, { id, client_name, mobile, email, business_name, project_description, request_admin_mobile, advance_booking: 0, email_state: "pending" });
          return { meta: { changes: 1 } };
        }
        if (sql.startsWith("UPDATE payment_orders SET payment_id")) {
          const [pid, cid, oid] = values; const o = self.orders.get(oid);
          if (o && (!o.payment_id || o.payment_id === pid) && (!o.contact_id || o.contact_id === cid)) {
            Object.assign(o, { payment_id: pid, contact_id: cid, status: "captured" });
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        }
        if (sql.startsWith("UPDATE payment_orders SET status = 'captured'")) {
          const [pid, oid] = values; const o = self.orders.get(oid);
          if (o && (!o.payment_id || o.payment_id === pid)) Object.assign(o, { payment_id: pid, status: "captured" });
          return { meta: { changes: 1 } };
        }
        if (sql.startsWith("UPDATE contacts SET email_state = 'sending'")) {
          const c = self.contacts.get(values[0]);
          if (c && ["pending", "failed"].includes(c.email_state)) { c.email_state = "sending"; return { meta: { changes: 1 } }; }
          return { meta: { changes: 0 } };
        }
        if (sql.startsWith("UPDATE contacts SET email_state = 'sent'")) {
          const [idValue, id] = values; const c = self.contacts.get(id);
          c.email_state = "sent"; c.email_message_id = idValue;
          return { meta: { changes: 1 } };
        }
        if (sql.startsWith("UPDATE contacts SET email_state = 'failed'")) {
          const [reason, id] = values; const c = self.contacts.get(id);
          c.email_state = "failed"; c.email_error = reason;
          return { meta: { changes: 1 } };
        }
        if (sql.startsWith("INSERT OR IGNORE INTO payment_refunds")) {
          const [id, payment_id, amount_paise] = values;
          if (self.refunds.has(id)) return { meta: { changes: 0 } };
          self.refunds.set(id, { id, payment_id, amount_paise });
          return { meta: { changes: 1 } };
        }
        if (sql.startsWith("UPDATE payment_orders SET refunded_paise")) {
          const [amount, current, ceiling, pid] = values;
          for (const o of self.orders.values()) {
            if (o.payment_id === pid) {
              o.refunded_paise = Math.max(o.refunded_paise || 0, amount);
              o.status = Math.max(o.refunded_paise, current) >= ceiling ? "refunded" : "partially_refunded";
            }
          }
          return { meta: { changes: 1 } };
        }
        if (sql.startsWith("INSERT OR IGNORE INTO payment_events")) {
          self.events.set(values[0], { id: values[0], event: values[1] });
          return { meta: { changes: 1 } };
        }
        throw new Error("Unhandled mutation " + sql);
      },
      async all() { return { results: [...self.contacts.values()] }; }
    };
    return stmt;
  }
  async batch(statements) { return Promise.all(statements.map((s) => s.run())); }
}
function env(db = new MockDB(), send = async () => ({ messageId: "msg_1" })) {
  return {
    DB: db, RATE_LIMIT_SALT: "test-rate-salt", RAZORPAY_KEY_ID: "rzp_test_123",
    RAZORPAY_KEY_SECRET: key, RAZORPAY_WEBHOOK_SECRET: "webhook-secret",
    REKIXO_TO_EMAIL: "ai@rekixo.com", REKIXO_FROM_EMAIL: "no-reply@rekixo.com",
    EMAIL: { send }
  };
}

test("signed Razorpay checkout uses exact order|payment and constant-time hex comparison", async () => {
  const sig = await hmacHex(key, "order_123|pay_456");
  assert.equal(sig.length, 64);
  assert.equal(equalHex(sig, sig.toUpperCase()), true);
  assert.equal(await verifyHmac(key, "order_123|pay_456", sig), true);
  assert.equal(await verifyHmac(key, "order_123|pay_000", sig), false);
  assert.equal(equalHex("bad", sig), false);
});
test("customer matching and validation reject order identity changes", () => {
  const normalized = bookingIdentity({ ...person, email: "OWNER@EXAMPLE.COM" });
  assert.equal(validateIdentity(normalized), null);
  assert.equal(validateIdentity({ ...normalized, mobile: "invalid" }), "Valid mobile number is required");
  assert.equal(sameBooking({ client_name: normalized.clientName, mobile: normalized.mobile,
    email: normalized.email, business_name: normalized.businessName }, normalized), true);
  assert.equal(sameBooking({ client_name: "Fraud", mobile: normalized.mobile,
    email: normalized.email, business_name: normalized.businessName }, normalized), false);
});
test("API health validates D1 availability", async () => {
  const response = await handleRequest(new Request("https://rekixo.com/api/health"), env());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).database, "ready");
});
test("cross-origin browser POST is denied", async () => {
  const res = await handleRequest(request("/api/contact", { ...person }, { origin: "https://attacker.invalid" }), env());
  assert.equal(res.status, 403);
});
test("free contact stored in D1 and forwarded through Cloudflare Email Service", async () => {
  const db = new MockDB(); let sends = 0;
  const environment = env(db, async (mail) => { sends++; assert.equal(mail.to, "ai@rekixo.com"); return { messageId: "msg_1" }; });
  const res = await handleRequest(request("/api/contact", {
    ...person, projectDescription: "Please create our site and dashboard", websiteExtra: "",
    advanceBookingFastService: false
  }), environment);
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
  assert.equal(db.contacts.size, 1);
  assert.equal(db.contacts.get(json.requestId).email_state, "sent");
  assert.equal(sends, 1);
});
test("email failure does not lose the persisted customer enquiry", async () => {
  const db = new MockDB();
  const res = await handleRequest(request("/api/contact", {
    ...person, projectDescription: "Please build software for my business"
  }), env(db, async () => { throw new Error("email provider down"); }));
  assert.equal((await res.json()).ok, true);
  assert.equal([...db.contacts.values()][0].email_state, "failed");
});
test("paid booking checks fixed amount, Razorpay signature, captured status and repeat idempotency", async () => {
  const db = new MockDB();
  const environment = env(db);
  const oldFetch = globalThis.fetch;
  let payLookups = 0;
  globalThis.fetch = async (url, options) => {
    if (String(url).endsWith("/orders")) {
      assert.equal(JSON.parse(options.body).amount, 100000);
      return Response.json({ id: "order_REKIXO", amount: 100000, currency: "INR" });
    }
    if (String(url).endsWith("/payments/pay_REKIXO")) {
      payLookups++;
      return Response.json({ id: "pay_REKIXO", order_id: "order_REKIXO",
        amount: 100000, currency: "INR", status: "captured" });
    }
    throw new Error("Unexpected fetch " + url);
  };
  try {
    const orderRes = await handleRequest(request("/api/payment/order", person), environment);
    assert.equal(orderRes.status, 200);
    assert.equal((await orderRes.json()).amount, 100000);
    const body = {
      ...person, projectDescription: "A business website with project management",
      advanceBookingFastService: true, razorpayOrderId: "order_REKIXO",
      razorpayPaymentId: "pay_REKIXO", razorpaySignature: "invalid"
    };
    const invalidRes = await handleRequest(request("/api/contact", body), environment);
    assert.equal(invalidRes.status, 403);
    assert.equal(db.contacts.size, 0);
    body.razorpaySignature = await hmacHex(key, "order_REKIXO|pay_REKIXO");
    const res = await handleRequest(request("/api/contact", body), environment);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ok, true);
    assert.equal(db.contacts.size, 1);
    const replay = await handleRequest(request("/api/contact", body), environment);
    assert.equal(replay.status, 200);
    assert.equal(db.contacts.size, 1);
    assert.equal(payLookups, 2);
    assert.equal([...db.contacts.values()][0].advance_booking, 1);
  } finally { globalThis.fetch = oldFetch; }
});
test("native webhook requires valid HMAC and ignores unsigned events", async () => {
  const environment = env();
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: {
    order_id: "order_fake", id: "pay_fake", amount: 100000, currency: "INR", status: "captured"
  } } } });
  const unsigned = await handleRequest(new Request("https://rekixo.com/api/payment/webhook",
    { method: "POST", body, headers: { "x-razorpay-signature": "bogus" } }), environment);
  assert.equal(unsigned.status, 401);
  const sig = await hmacHex("webhook-secret", body);
  const signed = await handleRequest(new Request("https://rekixo.com/api/payment/webhook", {
    method: "POST", body, headers: { "x-razorpay-signature": sig, "x-razorpay-event-id": "evt_1" }
  }), environment);
  assert.equal(signed.status, 200);
});

test("two distinct signed partial refunds add up without double-counting webhook replays", async () => {
  const db = new MockDB();
  const environment = env(db);
  db.orders.set("order_refund", {
    id: "order_refund", payment_id: "pay_refund", amount_paise: 100000,
    currency: "INR", status: "captured", refunded_paise: 0
  });
  async function emitRefund(id, amount, eventId) {
    const raw = JSON.stringify({ event: "refund.processed", payload: { refund: {
      entity: { id, payment_id: "pay_refund", amount }
    } } });
    return handleRequest(new Request("https://rekixo.com/api/payment/webhook", {
      method: "POST", body: raw, headers: {
        "x-razorpay-signature": await hmacHex("webhook-secret", raw),
        "x-razorpay-event-id": eventId
      }
    }), environment);
  }
  assert.equal((await emitRefund("rfnd_1", 40000, "evt_rfnd_1")).status, 200);
  assert.equal(db.orders.get("order_refund").status, "partially_refunded");
  assert.equal(db.orders.get("order_refund").refunded_paise, 40000);
  assert.equal((await emitRefund("rfnd_1", 40000, "evt_rfnd_1")).status, 200);
  assert.equal(db.orders.get("order_refund").refunded_paise, 40000);
  assert.equal((await emitRefund("rfnd_2", 60000, "evt_rfnd_2")).status, 200);
  assert.equal(db.orders.get("order_refund").status, "refunded");
  assert.equal(db.orders.get("order_refund").refunded_paise, 100000);
});
