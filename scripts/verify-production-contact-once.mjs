// One-time production QA only. Sends a clearly labeled synthetic non-paying lead.
// Requires no secrets. Do not run repeatedly: a real D1 test row will be created.
const url = "https://rekixo.com/api/contact";
const payload = {
  clientName: "REKIXO INTERNAL QA CHECK",
  mobile: "0000000000",
  email: "ai@rekixo.com",
  businessName: "REKIXO SYSTEM TEST - NOT A CUSTOMER",
  projectDescription: "One-time production contact persistence verification. Ignore this record; no actual customer or paid booking is involved.",
  advanceBookingFastService: false,
  requestAdminMobile: false,
  websiteExtra: ""
};
const response = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Origin": "https://rekixo.com" },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(20000)
});
const body = await response.json().catch(() => ({}));
if (response.status !== 200 || body.ok !== true || !/^[0-9a-f-]{36}$/i.test(body.requestId || "")) {
  throw new Error("Production non-paid lead was not persisted: HTTP " + response.status + " " + JSON.stringify(body));
}
if (!["sent", "failed", "pending"].includes(body.emailNotification)) {
  throw new Error("Missing or unexpected email delivery state: " + JSON.stringify(body));
}
console.log("PASS: One synthetic, non-paid REKIXO enquiry persisted in production D1.");
console.log("D1 enquiry id: " + body.requestId);
console.log("Email attempt state: " + body.emailNotification);
console.log("No payment order created. This is a labeled internal QA record, not a real customer.");
