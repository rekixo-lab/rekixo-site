import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (name) => readFileSync(new URL("../public/" + name, import.meta.url), "utf8");
const home = source("index.html");
const portfolio = source("portfolio.html");
const shared = source("rekixo-v3.js");
const css = source("rekixo-v3.css");

test("homepage introduces Rekixo before showing product previews", () => {
  assert.equal((home.match(/<h1\b/g) || []).length, 1, "homepage needs one clear primary heading");
  assert.ok(home.includes('id="rekixo-intro-title"'));
  assert.ok(home.indexOf('class="rx3-company-hero"') < home.indexOf('id="products"'));
  assert.ok(home.indexOf('id="products"') < home.indexOf('class="rx3-hero"'));
  assert.match(home, /href="contact\.html">Discuss a Project<\/a>/);
  assert.match(home, /href="#products">Explore Our Products<\/a>/);
});

test("all five product families have a homepage card and a portfolio entry", () => {
  const products = {
    FinWorkar: "finworkar",
    "Rekixo AR3D": "rekixo-ar3d",
    GeoLive: "geolive",
    LudoPaws: "ludopaws",
    EntroNex: "entronex",
  };
  for (const [name, anchor] of Object.entries(products)) {
    assert.ok(home.includes("<h3>" + name + "</h3>"), name + " homepage card");
    assert.ok(portfolio.includes('id="' + anchor + '"'), name + " portfolio anchor");
    assert.ok(portfolio.includes("<h2>" + name + "</h2>"), name + " portfolio title");
  }
  assert.match(portfolio, /pre-audit/i, "EntroNex certification limitations stay visible");
  assert.doesNotMatch(home + portfolio, /guaranteed fairness|certified randomness/i, "avoid unsupported EntroNex claims");
});

test("mobile cards reflow to one column and all routes remain local or grounded", () => {
  assert.match(css, /@media\(max-width:680px\)\{\.rx3-product-cards\{grid-template-columns:minmax\(0,1fr\)\}\}/);
  for (const anchor of ["geolive", "ludopaws", "entronex"]) {
    assert.match(home, new RegExp('href="portfolio\\.html#' + anchor + '"'));
  }
  assert.match(portfolio, /https:\/\/ludopaws\.rekixo\.com\//);
});

test("keyboard users can bypass global navigation and close mobile menu with Escape", () => {
  assert.match(shared, /skip\.className = "rx3-skip-link"/);
  assert.match(shared, /main\.setAttribute\("tabindex", "-1"\)/);
  assert.match(shared, /aria-controls=\\"rx3-mobile-navigation\\"/);
  assert.match(shared, /event\.key === "Escape"/);
  assert.match(css, /\.rx3-skip-link:focus/);
});

test("featured carousel does not advance on a timer", () => {
  assert.doesNotMatch(shared, /setInterval/);
  assert.match(shared, /data-rx3-slider-track/);
  assert.match(shared, /ArrowLeft/);
  assert.match(shared, /pointerup/);
});
