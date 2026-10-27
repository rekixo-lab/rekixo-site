import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../public/" + path, import.meta.url), "utf8");
const home = read("index.html");
const styles = read("rekixo-immersive.css");
const script = read("rekixo-immersive.js");

test("premium homepage is a product-first developer experience, not a fake live dashboard", () => {
  assert.match(home, /Products aren't just imagined/);
  assert.match(home, /INDEPENDENT SOFTWARE PRODUCT STUDIO/);
  assert.match(home, /READ ONLY · CONCEPT/);
  assert.match(home, /INTERACTIVE EXPLAINER · NOT A LIVE SERVER CONSOLE/);
  for (const family of ["FinWorkar", "Rekixo AR3D", "GeoLive", "LudoPaws", "EntroNex"]) {
    assert.ok(home.includes("<h3>" + family + "</h3>"), family);
  }
  assert.equal((home.match(/rx3-product-card rx3-reveal rx4-product-card/g) || []).length, 5);
});

test("genuine AR3D visual is intentionally left for the owner", () => {
  assert.match(home, /data-rx4-asset-slot="ar3d-masterplan"/);
  assert.match(home, /YOUR ORIGINAL MASTERPLAN/);
  assert.match(home, /no sample property shown/i);
  assert.doesNotMatch(home, /ar3d-showcase-04-arising-future-city.webp/);
});

test("animations use motion preferences and contain no external runtime dependencies", () => {
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(script, /prefers-reduced-motion: reduce/);
  assert.match(script, /requestAnimationFrame/);
  assert.doesNotMatch(script, /setInterval\s*\(/);
  assert.doesNotMatch(home, /https:\/\/cdnjs|unpkg\.com|jsdelivr\.net|fonts\.googleapis/i);
});

test("workbench uses real buttons and aria-controlled panels", () => {
  assert.equal((home.match(/role="tab" id="rx4-tab-/g) || []).length, 3);
  assert.equal((home.match(/role="tabpanel" id="rx4-panel-/g) || []).length, 3);
  assert.match(script, /ArrowLeft/);
  assert.match(script, /ArrowRight/);
  assert.match(script, /aria-selected/);
  assert.match(script, /panel\.hidden/);
});

test("real checkout, contact backend, and privacy URLs stay out of homepage interaction code", () => {
  assert.ok(home.includes('href="contact.html"'));
  assert.ok(home.includes('href="portfolio.html"'));
  assert.doesNotMatch(script, /api\/payment|Razorpay|\/api\/contact/);
});
