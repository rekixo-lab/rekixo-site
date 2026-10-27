import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const read=p=>readFileSync(new URL("../public/"+p,import.meta.url),"utf8");
const svg=read("entronex-verifiable-outcome-animated.svg");
const home=read("index.html"),port=read("portfolio.html");
const css=read("rekixo-immersive.css"),portfolioCss=read("entronex-portfolio.css");
test("source-accurate EntroNex illustration contains no invented blockchain claims",()=>{
  const hash=createHash("sha1").update("blob "+Buffer.byteLength(svg)+"\0").update(svg).digest("hex");
  assert.equal(hash,"a42f754bd12665a792dcc23aa145f7964fe1ca50");
  assert.match(svg,/data-entronex-asset="verifiable-outcome-concept-v2"/);
  for(const txt of ["CLIENT","SERVER","Commitment","BALANCED OUTCOME FIELD","PROOF DIGEST","ED25519 ATTESTATION","VERIFY LOCALLY","PRE-AUDIT","NO LIVE PROOFS"])
    assert.ok(svg.includes(txt),txt);
  assert.doesNotMatch(svg,/<text[^>]*>[^<]*(?:blockchain|certificate|guaranteed fair|casino)/i);
  assert.doesNotMatch(svg,/<script|onload\s*=|<foreignObject/i);
});
test("actual moving route, outcome sampler and reduced-motion support",()=>{
  assert.match(svg,/class="route"/);
  assert.match(svg,/class="sweep"/);
  assert.match(svg,/class="orbit"/);
  assert.match(svg,/@keyframes enFlow/);
  assert.match(svg,/@keyframes enScan/);
  assert.match(svg,/@media\(prefers-reduced-motion:reduce\)/);
  assert.ok((svg.match(/<polygon/g)||[]).length>=60,"balanced-field visual must not be a single generic shield");
});
test("homepage uses full square art and removes the old 3-token hash demo",()=>{
  assert.match(home,/class="rx4-visual rx4-entro-art rx4-entro-media"/);
  assert.match(home,/class="rx4-entro-image" src="entronex-verifiable-outcome-animated.svg"/);
  assert.doesNotMatch(home,/class="rx4-hash-stack"/);
  assert.match(css,/\.rx4-home \.rx4-visual\.rx4-entro-media\{[\s\S]*?aspect-ratio:1\/1/);
  assert.match(css,/\.rx4-home \.rx4-entro-image\{[\s\S]*?object-fit:contain/);
  assert.match(css,/\.rx4-home \.rx4-entro-media::after\{display:none\}/);
  assert.match(home,/Pre-audit; not certified/);
});
test("portfolio shows same visual with correct current v2/v4 and audit limitations",()=>{
  assert.match(port,/id="entronex"/);
  assert.match(port,/entronex-portfolio.css/);
  assert.match(port,/src="entronex-verifiable-outcome-animated.svg"/);
  assert.match(port,/v0\.9\.0-rc\.1, pre-independent-audit/);
  assert.match(port,/Experimental v4 Natural World is disabled in production/);
  assert.match(port,/Independent JavaScript and Python verification paths/);
  assert.match(portfolioCss,/@media\(max-width:860px\)/);
  assert.match(portfolioCss,/prefers-reduced-motion:reduce/);
});
