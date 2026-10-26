import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contact = readFileSync(new URL("../public/contact.html", import.meta.url), "utf8");
const sharedCss = readFileSync(new URL("../public/rekixo-v3.css", import.meta.url), "utf8");
const sharedJs = readFileSync(new URL("../public/rekixo-v3.js", import.meta.url), "utf8");

test("contact submit styles cannot enlarge shared mobile navigation buttons", () => {
  assert.match(contact, /\.submit-row button\s*\{\s*min-width:\s*180px;/);
  assert.match(contact, /\.submit-row button:disabled\s*\{/);
  assert.match(contact, /\.submit-row button\s*\{\s*width:\s*100%;/);
  assert.doesNotMatch(contact, /(?:^|\n)\s*button\s*\{/);
  assert.match(sharedCss, /\.rx3-menu-btn\s*\{[^}]*width:\s*44px;/);
  assert.match(sharedCss, /\.rx3-theme-toggle\s*\{[^}]*width:\s*44px;/);
});

test("shared footer exposes all four legal policies at desktop and mobile widths", () => {
  const footer = sharedJs.split('const footer = document.createElement("footer");')[1]?.split("const existingFooter")[0];
  assert.ok(footer, "shared footer markup exists");
  for (const page of [
    "privacy-policy.html",
    "terms-and-conditions.html",
    "refund-cancellation-policy.html",
    "delivery-policy.html",
  ]) {
    assert.ok(footer.includes('href="' + page + '"'), "footer must link " + page);
  }
  assert.match(footer, /<strong>Legal<\/strong>/);
  assert.match(sharedCss, /\.rx3-footer-links\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(sharedCss, /@media\(max-width:680px\)\{[\s\S]*?\.rx3-footer-links\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
});

function contrastAgainstWhite(hex) {
  const components = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = components.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return 1.05 / (luminance + 0.05);
}

test("header CTA white text meets WCAG AA contrast at both gradient endpoints in both themes", () => {
  for (const [label, block] of [
    ["light", sharedCss.split(".rx3-navcta{")[1]?.split("}")[0]],
    ["dark", sharedCss.split('html[data-theme="dark"] .rx3-navcta{')[1]?.split("}")[0]],
  ]) {
    assert.ok(block, label + " CTA style exists");
    const gradient = block.match(/background:linear-gradient\(135deg,(#[0-9a-fA-F]{6}),(#[0-9a-fA-F]{6})\)!important;/);
    assert.ok(gradient, label + " CTA gradient uses explicit colors");
    for (const color of gradient.slice(1)) {
      assert.ok(contrastAgainstWhite(color) >= 4.5, label + " CTA " + color + " needs >= 4.5:1 contrast");
    }
  }
});
