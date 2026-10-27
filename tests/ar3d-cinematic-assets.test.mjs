import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const read = p => readFileSync(new URL("../public/"+p,import.meta.url));
const html = read("index.html").toString("utf8");
const ar = read("rekixo-ar3d.html").toString("utf8");
const css = read("rekixo-immersive.css").toString("utf8");
const browser = readFileSync(new URL("../scripts/browser-ui-check.mjs",import.meta.url),"utf8");
const sha = b => createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex");

test("two owner-approved AR3D images are optimized local WebP with immutable checksums",()=>{
  for (const [name,expected,bytes] of [
    ["rekixo-ar3d-cinematic-square.webp","46bbd42296d81eade177fc110dc2986ec7be26bf",130446],
    ["rekixo-ar3d-cinematic-wide.webp","fc5fab5e6680aec9cdd8acf3ed7cac09ef9fc0a6",124406]
  ]) {
    const file=read(name);
    assert.equal(file.length,bytes,name);
    assert.equal(file.toString("ascii",0,4),"RIFF",name);
    assert.equal(file.toString("ascii",8,12),"WEBP",name);
    assert.equal(sha(file),expected,name);
  }
});

test("AR3D card presents only the full square artwork without hover swapping",()=>{
  assert.match(html,/class="rx4-ar-image-square" src="rekixo-ar3d-cinematic-square.webp"/);
  assert.doesNotMatch(html,/class="rx4-ar-image-wide"/);
  assert.doesNotMatch(html,/class="rx4-ar-grid"/);
  assert.doesNotMatch(html,/class="rx4-ar-marker"/);
  assert.doesNotMatch(html,/class="rx4-ar-image-tag"/);
  assert.match(html,/href="rekixo-ar3d.html"/);
  assert.match(css,/\.rx4-home \.rx4-visual\.rx4-ar-media\{[\s\S]*?aspect-ratio:1 \/ 1/);
  assert.match(css,/\.rx4-home \.rx4-ar-image-square\{[\s\S]*?object-fit:contain/);
  assert.match(css,/\.rx4-home \.rx4-ar-media::after\{[\s\S]*?display:none/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test("old empty masterplan slot now contains full widescreen AR3D visual and truthful disclaimer",()=>{
  assert.match(html,/class="rx4-ar3d-feature-frame rx3-reveal" data-rx4-asset-slot="ar3d-masterplan"/);
  assert.match(html,/src="rekixo-ar3d-cinematic-wide.webp" width="1120" height="630"/);
  assert.match(html,/CONCEPT VISUAL · SAMPLE PLOT DATA/);
  assert.match(html,/aria-label="Open full-size illustrative AR3D property visualization"/);
  assert.doesNotMatch(html,/YOUR ORIGINAL MASTERPLAN/);
  assert.doesNotMatch(html,/VISUAL SLOT 01/);
  assert.match(css,/\.rx4-ar3d-feature-stage>img\{[\s\S]*?object-fit:contain/);
});

test("AR3D product hero shows cinematic art but real customer-project gallery stays genuine",()=>{
  assert.match(ar,/src="rekixo-ar3d-cinematic-wide.webp" width="1120" height="630"/);
  assert.match(ar,/Illustrative preview/);
  assert.match(ar,/ar3d-showcase\/ar3d-showcase-02-shree-banashankari.webp/);
  assert.match(ar,/ar3d-showcase\/ar3d-showcase-03-vatika-green-city.webp/);
  assert.match(ar,/ar3d-showcase\/ar3d-showcase-11-builder-admin-dashboard.webp/);
});
test("browser QA protects square-card dimensions and wide showcase at breakpoints",()=>{
  assert.match(browser,/rekixo-ar3d-cinematic-square.webp/);
  assert.match(browser,/rekixo-ar3d-cinematic-wide.webp/);
  assert.match(browser,/square AR3D card/);
  assert.match(browser,/ar3d-masterplan/);
});
