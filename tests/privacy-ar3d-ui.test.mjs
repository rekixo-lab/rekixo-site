import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL("../public/" + file, import.meta.url), "utf8");
const policy = read("privacy-policy.html");
const contact = read("contact.html");
const ar3d = read("rekixo-ar3d.html");

test("privacy notice identifies real website data flows without blanket certification claims", () => {
  for (const term of ["Cloudflare D1", "Cloudflare Worker", "Google Workspace", "Gmail API", "Razorpay", "local storage"]) {
    assert.ok(policy.toLowerCase().includes(term.toLowerCase()), "privacy should disclose " + term);
  }
  assert.match(policy, /id="website-data"/);
  assert.match(policy, /id="preferences"/);
  assert.match(policy, /Last updated: 26 October 2026/);
  assert.doesNotMatch(policy, /100% secure|GDPR compliant|3 years of retention/i);
});

test("enquiry form visibly links to its privacy policy and does not require payment", () => {
  assert.ok(contact.includes('href="privacy-policy.html"'));
  assert.ok(contact.includes("A standard enquiry does not require optional advance booking."));
  assert.match(contact, /type="checkbox"[^>]*data-fast-booking/);
});

test("AR3D keeps original screenshots and full-resolution access, while compacting previews", () => {
  assert.equal((ar3d.match(/data-open-hires/g) || []).length >= 8, true, "full-size screenshot controls must remain");
  assert.match(ar3d, /\.showcase-list\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(ar3d, /grid-auto-flow:column/);
  assert.match(ar3d, /\.showcase-list>\.showcase-grid-3\{display:contents\}/);
  assert.match(ar3d, /data-hires-image/);
  assert.match(ar3d, /id="showcase"/);
  assert.match(ar3d, /id="platform-surfaces"/);
});
