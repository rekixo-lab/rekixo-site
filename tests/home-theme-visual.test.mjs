import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const styles = readFileSync(new URL("../public/rekixo-immersive.css", import.meta.url), "utf8");
const sharedJS = readFileSync(new URL("../public/rekixo-v3.js", import.meta.url), "utf8");
const browserQA = readFileSync(new URL("../scripts/browser-ui-check.mjs", import.meta.url), "utf8");

test("homepage has light AND dark canvases instead of permanent dark-only background", () => {
  assert.match(styles, /html\[data-theme="light"\] body\.rx4-home\{[\s\S]*?background:#f7faff!important/);
  assert.match(styles, /html\[data-theme="dark"\] body\.rx4-home\{background:#050c17!important\}/);
  assert.match(styles, /html\[data-theme="light"\] body\.rx4-home main\{[\s\S]*?background:#f7faff!important/);
});
test("major homepage surfaces use explicit light palette", () => {
  for(const section of [".rx4-product-card",".rx4-products-section",".rx3-hero",".rx4-workbench",
    ".rx4-solutions .rx3-solution",".rx4-end-panel",".rx3-footer",".rx3-header",".rx3-mobile-menu"])
    assert.ok(styles.includes('html[data-theme="light"] body.rx4-home '+section), section+" lacks light palette");
});
test("logo source is tied to actual theme, not homepage route", () => {
  assert.doesNotMatch(sharedJS,/body\.classList\.contains\("rx4-home"\) \|\| (?:next|root\.dataset\.theme) === "dark"/);
  assert.match(sharedJS,/next === "dark" \? "rekixo-logo-static\.svg" : "rekixo-logo-light\.svg"/);
  assert.match(sharedJS,/root\.dataset\.theme === "dark" \? "rekixo-logo-static\.svg" : "rekixo-logo-light\.svg"/);
});
test("browser QA checks computed colors on homepage, not only data-theme", () => {
  for(const part of ["appearance.body","appearance.main","appearance.productSection",
    "appearance.workbench","appearance.footer","appearance.heroInk","appearance.productInk",
    "appearance.cardBackground","appearance.logo"])
    assert.ok(browserQA.includes(part),"missing computed visual assertion for "+part);
  assert.match(browserQA,/homepage theme did not survive reload/);
});
