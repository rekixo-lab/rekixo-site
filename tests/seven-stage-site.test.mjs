import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../public/" + path, import.meta.url), "utf8");

test("company identity is credible, founder-led, and avoids unsupported address verification", () => {
  const about = read("about.html");
  const business = read("business-info.html");
  assert.match(about, /founder-led/i);
  assert.match(about, /five product families/i);
  assert.doesNotMatch(business, /Verified business address|Verified map location/i);
  assert.doesNotMatch(business, /google\.com\/maps|<iframe/i);
  assert.match(business, /Legal entity name, tax registration/i);
});

test("company website remains free to contact without a new paid priority checkout", () => {
  const html = read("contact.html");
  assert.match(html, /Standard enquiries are free/);
  assert.match(html, /data-booking-recovery-option hidden/);
  assert.match(html, /fastBooking\.disabled = !initialPaidRecovery/);
  assert.match(html, /PAYMENT_RECOVERY_KEY/);
  assert.doesNotMatch(html, /<script src="https:\/\/checkout\.razorpay\.com/);
  assert.match(read("refund-cancellation-policy.html"), /Existing completed advance payments/);
  assert.match(read("terms-and-conditions.html"), /standard website enquiry is free/i);
});

test("portfolio remains five families with accurate caveats and distinct developer pages", () => {
  const home = read("index.html");
  const geo = read("geolive.html");
  const status = read("product-status.html");
  const shared = read("rekixo-v3.js");
  for (const product of ["FinWorkar", "Rekixo AR3D", "GeoLive", "LudoPaws", "EntroNex"]) {
    assert.ok(home.includes("<h3>" + product + "</h3>"));
    assert.ok(shared.includes(product));
  }
  assert.equal((home.match(/class="rx3-solution rx3-reveal"/g) || []).length, 3);
  assert.ok(home.includes('href="geolive.html"'));
  assert.match(geo, /trusted backend relay/i);
  assert.match(geo, /separate maintained Node\/PostgreSQL reference/i);
  assert.match(status, /25 October 2026/);
  assert.match(status, /pre-independent-audit/i);
  assert.match(read("rekixo-ar3d.html"), /separate database, asset storage and deployment boundaries/i);
});

test("site SEO excludes non-indexable status and promotional landing pages", () => {
  const sitemap = read("sitemap.xml");
  const entries = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((item) => item[1]);
  assert.equal(entries.length, new Set(entries).size, "duplicate sitemap URL");
  assert.ok(entries.includes("https://rekixo.com/geolive.html"));
  assert.ok(!entries.includes("https://rekixo.com/referral.html"));
  assert.ok(!entries.includes("https://rekixo.com/product-status.html"));
  for (const file of ["referral.html", "product-status.html"]) {
    assert.match(read(file), /name="robots" content="noindex,follow"/);
  }
  for (const file of ["index.html", "about.html", "business-info.html", "geolive.html"]) {
    const html = read(file);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /<link rel="canonical"/);
  }
  assert.match(read("referral.html"), /Affiliate disclosure/);
});

test("governance and privacy retain real provider disclosures and release limitations", () => {
  const privacy = read("privacy-policy.html");
  const status = read("product-status.html");
  const shared = read("rekixo-v3.js");
  for (const provider of ["Cloudflare D1", "Gmail API", "Razorpay", "local storage"]) {
    assert.ok(privacy.toLowerCase().includes(provider.toLowerCase()));
  }
  assert.match(status, /Google Play production review/i);
  assert.match(status, /not a live availability dashboard/i);
  assert.match(shared, /Privacy Policy/);
  assert.match(shared, /Delivery Policy/);
});
