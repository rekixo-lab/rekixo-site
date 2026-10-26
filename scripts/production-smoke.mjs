// Read-only production smoke checks plus intentionally invalid API requests.
// This never creates a Razorpay order, sends money, or inserts a customer enquiry.
const base = "https://rekixo.com";
const test = async (label, path, options, expectedStatus) => {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(12000), redirect: "error", ...options });
  const text = await response.text();
  if (response.status !== expectedStatus) {
    throw new Error(label + ": expected HTTP " + expectedStatus + ", received " + response.status +
      ", body: " + text.slice(0, 150));
  }
  console.log("PASS " + label + " (HTTP " + response.status + ")");
  return text;
};
const json = JSON.parse(await test("Cloudflare D1 health", "/api/health", {}, 200));
if (!json.ok || json.platform !== "cloudflare" || json.database !== "ready") {
  throw new Error("Production health endpoint did not report live Cloudflare D1");
}
const home = await test("Root homepage", "/", {}, 200);
if (!home.includes("<html") || !home.includes("Rekixo")) throw new Error("Production root not serving website HTML");
const contact = await test("Contact HTML", "/contact.html", {}, 200);
if (!contact.includes('data-project-request-form') || !contact.includes("/api/payment/order")) {
  throw new Error("Contact form or same-origin payment route missing");
}
await test("Unknown page is a genuine 404", "/not-a-real-rekixo-page-smoke-404", {}, 404);
// Negative admin checks only: never supply a valid token or read customer data.
for (const [label, auth] of [["No admin credentials", undefined], ["Incorrect admin credentials", "Bearer invalid-smoke-test-token"]]) {
  const protectedBody = JSON.parse(await test(label, "/api/admin/contacts", auth ? {
    headers: { Authorization: auth }
  } : {}, 401));
  if (!/unauthorized/i.test(protectedBody.error || "")) {
    throw new Error("Admin authorization boundary returned an unexpected response");
  }
}
// The body intentionally fails server-side validation before any paid order is created.
const badOrder = JSON.parse(await test("No checkout for short description", "/api/payment/order", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Origin": base },
  body: JSON.stringify({
    clientName: "REKIXO Smoke",
    mobile: "+919999999999",
    email: "smoke-test@example.invalid",
    businessName: "REKIXO Monitoring",
    projectDescription: "Too short"
  })
}, 400));
if (!/description/i.test(badOrder.error || "")) throw new Error("Unexpected invalid checkout response");
// Invalid-signature security check: this cannot create payment events or charges.
const webhookRejection = JSON.parse(await test("Reject unsigned live Razorpay webhook", "/api/payment/webhook", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Razorpay-Signature": "invalid-test-signature" },
  body: JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: {
      id: "pay_invalid_test",
      order_id: "order_invalid_test",
      amount: 100000,
      currency: "INR",
      status: "captured"
    } } }
  })
}, 401));
if (!/signature/i.test(webhookRejection.error || "")) {
  throw new Error("Unexpected invalid-signature webhook response");
}
// Live www should canonicalize all paths to the apex, not just the homepage.
for (const path of ["/", "/contact.html?utm_source=www-smoke"]) {
  const response = await fetch("https://www.rekixo.com" + path, {
    redirect: "manual",
    signal: AbortSignal.timeout(12000)
  });
  const expected = "https://rekixo.com" + path;
  if (response.status !== 308 || response.headers.get("location") !== expected) {
    throw new Error("WWW redirect invalid for " + path +
      ": HTTP " + response.status + " location " + response.headers.get("location"));
  }
  console.log("PASS www canonical redirect " + path + " (HTTP 308)");
}
console.log("Production smoke checks passed. No charges, orders or contact enquiries were created.");
