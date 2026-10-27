import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const read = (p) => readFileSync(new URL("../public/" + p, import.meta.url));
const html = read("index.html").toString("utf8");
const css = read("rekixo-immersive.css").toString("utf8");
const js = read("rekixo-immersive.js").toString("utf8");
const originalImage = read("ludopaws-board.webp");

test("original LudoPaws board bytes exactly match the official game website repo", () => {
  const gitBlob = createHash("sha1").update("blob " + originalImage.length + "\0").update(originalImage).digest("hex");
  assert.equal(gitBlob,"821adfa6ca1f7c4beca744ac79b2725b3baae4be");
  assert.equal(originalImage.subarray(0,4).toString(),"RIFF");
  assert.equal(originalImage.subarray(8,12).toString(),"WEBP");
  assert.ok(originalImage.length < 75_000,"Card image must remain lightweight");
});
test("real board replaces fake four-color CSS board, while catalog links remain", () => {
  assert.match(html,/class="rx4-lp-board-image" src="ludopaws-board\.webp"/);
  assert.match(html,/data-rx4-ludo-replay/);
  assert.match(html,/href="portfolio\.html#ludopaws"/);
  for(const pet of ["goat","duck","dog","cat"]) assert.match(html,new RegExp('data-rx4-lp-pawn="'+pet+'"'));
  assert.doesNotMatch(html,/class="rx4-ludo-board"/);
  assert.doesNotMatch(css,/\.rx4-home \.rx4-ludo-board\{/);
  assert.equal((html.match(/rx3-product-card rx3-reveal rx4-product-card/g)||[]).length,5);
});
test("clickable interactive preview uses a native accessible button, not a nested link", () => {
  assert.match(html,/<button class="rx4-visual rx4-ludo-art rx4-lp-stage" type="button"/);
  assert.match(html,/aria-label="Roll the dice and preview a LudoPaws character move"/);
  assert.match(html,/data-rx4-lp-status/);
  assert.match(js,/gamePreview\.addEventListener\("click"/);
  assert.match(js,/const playTurn = async/);
  assert.match(js,/reduced\.matches/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test("animal movement is a safe illustrative local preview, not a multiplayer API", () => {
  assert.match(js,/Actual|Authentic LudoPaws board art/);
  assert.match(js,/online match/);
  assert.doesNotMatch(js,/fetch\(|WebSocket|BroadcastChannel/);
  assert.match(html,/illustrative dice roll/);
});
