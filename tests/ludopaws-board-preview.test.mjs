import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const read = p => readFileSync(new URL("../public/" + p, import.meta.url));
const html = read("index.html").toString("utf8");
const css = read("rekixo-immersive.css").toString("utf8");
const js = read("rekixo-immersive.js").toString("utf8");
const board = read("ludopaws-classic-code-preview.svg").toString("utf8");
const hero = read("ludopaws-2026-official-art.webp");
const blobHash = bytes => createHash("sha1").update("blob " + bytes.length + "\0").update(bytes).digest("hex");

test("new art is exactly the official source asset from codex/ludopaws-work", () => {
  assert.equal(blobHash(hero), "bf6242f71edcc9958024a32bb56a468f0efdd2d8");
  assert.equal(hero.subarray(0,4).toString(),"RIFF");
  assert.equal(hero.subarray(8,12).toString(),"WEBP");
});
test("new Classic board web view uses nonuniform Android-branch geometry", () => {
  assert.match(board, /viewBox="0 0 160 160"/);
  assert.match(board, /Classic LudoPaws Board — Code-Derived Web Preview/);
  assert.match(board, /#b6b8a0/);
  assert.match(board, /L80 64L94 75/);
  assert.doesNotMatch(html, /src="ludopaws-board\.webp"/);
  assert.match(html, /src="ludopaws-classic-code-preview\.svg"/);
  assert.match(css, /ludopaws-2026-official-art\.webp/);
});
test("all four preview pawns use the real game's track encoding, not arbitrary moves", () => {
  for(const pet of ["goat","duck","dog","cat"])
    assert.match(html,new RegExp('data-rx4-lp-pawn="'+pet+'"'));
  assert.match(js, /START_OFFSETS = \{ goat:0, duck:13, cat:26, dog:39 \}/);
  assert.match(js, /const TRACK = \[/);
  assert.match(js, /const axisBoundary = \(index\)/);
  assert.match(js, /index \* 50 \/ 6/);
  assert.match(js, /50 \+ \(index - 6\) \* 50 \/ 3/);
  assert.match(js, /gamePreview\.addEventListener\("click"/);
  assert.match(js, /const playTurn=async/);
  assert.match(js, /reduced\.matches/);
  assert.equal((html.match(/rx3-product-card rx3-reveal rx4-product-card/g)||[]).length,5);
});
test("honest responsive preview: not an Android GLES screenshot or a multiplayer match", () => {
  assert.match(html,/Classic board layout based on the newest Android branch/);
  assert.match(html,/data-rx4-lp-status aria-live="polite"/);
  assert.match(html,/<button class="rx4-visual rx4-ludo-art rx4-lp-stage" type="button"/);
  assert.match(js,/Android GLES30 character geometry cannot run directly/);
  assert.doesNotMatch(js,/fetch\(|WebSocket|BroadcastChannel/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
