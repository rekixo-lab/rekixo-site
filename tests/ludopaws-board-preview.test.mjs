import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const read = p => readFileSync(new URL("../public/" + p, import.meta.url));
const html = read("index.html").toString("utf8");
const css = read("rekixo-immersive.css").toString("utf8");
const js = read("rekixo-immersive.js").toString("utf8");
const board = read("ludopaws-user-board-640.avif");
const blobHash = bytes => createHash("sha1").update("blob " + bytes.length + "\0").update(bytes).digest("hex");

test("approved, complete user-supplied square board is stored as a verified local AVIF", () => {
  assert.equal(blobHash(board), "9dc23518f72968936919cb156ed76f824322e321");
  assert.equal(board.length, 24502);
  assert.equal(board.toString("ascii",4,8), "ftyp");
  assert.equal(board.toString("ascii",8,12), "avif");
  assert.ok(board.length < 100_000,"homepage asset must remain lightweight");
  assert.match(html, /src="ludopaws-user-board-640\.avif" width="640" height="640"/);
  assert.doesNotMatch(html, /src="ludopaws-classic-code-preview\.svg"/);
  assert.doesNotMatch(html, /src="ludopaws-board\.webp"/);
});

test("all four original illustrated teams remain visible with overlays hidden by default", () => {
  for(const pet of ["goat","duck","dog","cat"]) {
    assert.match(html,new RegExp('data-rx4-lp-pawn="'+pet+'"'));
  }
  assert.match(css,/\.rx4-home \.rx4-lp-board-image\{[\s\S]*?object-fit:contain/);
  assert.match(css,/background-image:url\("ludopaws-user-board-640\.avif"\)/);
  assert.match(css,/opacity:0;transition:opacity/);
  assert.match(css,/\.rx4-home \.rx4-lp-animal\[data-rx4-active="true"\]\{opacity:1\}/);
  assert.match(js,/animal\.setAttribute\("data-rx4-active","true"\)/);
  assert.equal((html.match(/rx3-product-card rx3-reveal rx4-product-card/g)||[]).length,5);
});

test("animated tokens follow the approved art's three equal regions and original Ludo game track", () => {
  assert.match(js,/const TRACK = \[/);
  assert.match(js,/START_OFFSETS = \{ goat:0, duck:13, cat:26, dog:39 \}/);
  assert.match(js,/index \* \(100 \/ 18\)/);
  assert.match(js,/\(100 \/ 3\) \+ \(index - 6\) \* \(100 \/ 9\)/);
  assert.match(js,/\(axisBoundary\(col\) \+ axisBoundary\(col \+ 1\)\) \/ 2/);
  assert.match(js,/gamePreview\.addEventListener\("click"/);
  assert.match(js,/const playTurn=async/);
  assert.match(js,/reduced\.matches/);
});

test("preview is accessible, honest and not connected to real multiplayer traffic", () => {
  assert.match(html,/Tap for a short illustrative dice-and-pawn move/);
  assert.match(html,/data-rx4-lp-status aria-live="polite"/);
  assert.match(html,/<button class="rx4-visual rx4-ludo-art rx4-lp-stage" type="button"/);
  assert.match(html,/href="portfolio\.html#ludopaws"/);
  assert.doesNotMatch(js,/fetch\(|WebSocket|BroadcastChannel/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test("LudoPaws occupies a large square card equal to EntroNex without clipping pets", () => {
  assert.match(css,/\.rx4-home \.rx4-visual\.rx4-lp-stage\{[\s\S]*?height:auto;aspect-ratio:1\/1/);
  assert.match(css,/\.rx4-home \.rx4-lp-board\{[\s\S]*?width:93%;height:auto;aspect-ratio:1\/1/);
  assert.match(css,/\.rx4-home \.rx4-lp-stage::after\{display:none\}/);
  assert.doesNotMatch(css,/\.rx4-home \.rx4-lp-stage\{height:(?:232|245)px\}/);
  assert.match(css,/\.rx4-home \.rx4-visual\.rx4-entro-media\{[\s\S]*?aspect-ratio:1\/1/);
  assert.match(html,/data-rx4-ludo-replay/);
});
