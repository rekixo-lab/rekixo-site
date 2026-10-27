import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const css=readFileSync(new URL("../public/rekixo-v3.css",import.meta.url),"utf8");
const browser=readFileSync(new URL("../scripts/browser-ui-check.mjs",import.meta.url),"utf8");
test("legacy policy tile text and warning notices receive explicit foregrounds in both themes",()=>{
  for(const theme of ["light","dark"]){
    for(const selector of [".info-tile span",".info-tile a",".notice",".service-card span"])
      assert.ok(css.includes('html[data-theme="'+theme+'"] body.rx-v3-page '+selector),theme+" "+selector);
  }
});
test("mobile header moves theme control beside menu with bounded spacing",()=>{
  assert.match(css,/@media\(max-width:860px\)\{[\s\S]*?\.rx3-nav>\.rx3-theme-toggle\{margin-left:auto\}/);
  assert.match(css,/\.rx3-nav>\.rx3-menu-btn\{margin-left:0\}/);
  assert.match(browser,/positions\.gap >= 0 && positions\.gap <= 14/);
});
test("Chromium QA iterates every HTML page in both light and dark themes",()=>{
  assert.match(browser,/readdir\(publicDir\)/);
  assert.match(browser,/for \(const theme of \["light","dark"\]\)/);
  assert.match(browser,/ratio<4\.5/);
  assert.match(browser,/scrollWidth<=width\+1/);
});
