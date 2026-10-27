import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const publicRoot = fileURLToPath(new URL("../public/", import.meta.url));
const png = readFileSync(join(publicRoot, "favicon.png"));
const apple = readFileSync(join(publicRoot, "apple-touch-icon.png"));
const ico = readFileSync(join(publicRoot, "favicon.ico"));
const svg = readFileSync(join(publicRoot, "rekixo-favicon.svg"), "utf8");

test("Search favicon is square PNG, 96px, drawn from original Rekixo R", () => {
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(png.readUInt32BE(16), 96);
  assert.equal(png.readUInt32BE(20), 96);
  assert.match(svg, /id="mark-r"/, "keep original vector R source");
  assert.deepEqual(apple, png, "Apple touch must not use the old square boxed R icon");
  assert.equal(ico.subarray(0, 4).toString("hex"), "00000100");
});

test("All 22 site pages reference the same original-R favicon PNG", () => {
  const htmlFiles = readdirSync(publicRoot).filter((name) => name.endsWith(".html"));
  assert.ok(htmlFiles.length >= 22);
  for (const name of htmlFiles) {
    const html = readFileSync(join(publicRoot, name), "utf8");
    assert.match(html, /rel="icon" type="image\/png" sizes="96x96" href="\/favicon\.png"/, name);
    assert.match(html, /rel="apple-touch-icon" href="\/apple-touch-icon\.png"/, name);
    assert.doesNotMatch(html, /rel="icon"[^>]*rekixo-favicon\.svg/, name);
  }
});

test("Googlebot and Googlebot-Image can crawl favicon assets", () => {
  const robots = readFileSync(join(publicRoot, "robots.txt"), "utf8");
  assert.match(robots, /User-agent:\s*\*/);
  assert.match(robots, /Allow:\s*\//);
  assert.doesNotMatch(robots, /Disallow:\s*\/(?:favicon|apple-touch)/);
});
