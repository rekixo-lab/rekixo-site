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
console.log("Production smoke checks passed. No charges, orders or contact enquiries were created.");
