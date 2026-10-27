# LudoPaws homepage — current 2026 development-branch preview

**Updated:** 27 October 2026

## Sources and what is authentic

The authoritative development branch is `rekixo-lab/ludopaws@codex/ludopaws-work`, current inspected commit `64f38dd2c7c135740c217731443841feb235a410`. It is 36 commits ahead of `main`.

- **Genuine source art:** `android/app/src/main/res/drawable-nodpi/ludo_paws_home_hero.webp`. Copied byte-for-byte into `public/ludopaws-2026-official-art.webp` (Git blob SHA `bf6242f71edcc9958024a32bb56a468f0efdd2d8`). The original developer-provided official promotional art depicts Dog, Cat, Duck, Goat. It is promotional artwork; **not** the actual GLES30 character renderer output. Some graphic styling (for example decorative accessories) differs from the latest in-game natural-anatomy rendering policy.
- **Accurate board coordinate source:** `LudoPawsFxBoardGeometry.kt`: 15 logical grid cells, physical nonuniform yard-road-yard widths 5/5/5, `TRACK` with 52 positions, and color-specific START_OFFSETS (RED 0, GREEN 13, YELLOW 26, BLUE 39).
- **Actual updated Classic board code:** `ClassicRoadScene.kt` / `ClassicRoadProfile`: inset `.026f`, depth `.045f`, capsule corners `.28f`; `ClassicJungleHabitat.kt`: forest clearings and native Canvas foliage; `ClassicBoardDefinition.kt`: neutral stone cells and mossy grounds.
- **Code-derived preview board:** `public/ludopaws-classic-code-preview.svg` follows those geometries, capsule road colors, jungle atmosphere and safe/entry positions. This is a **web-authored adaptation**, not a pixel-identical Android Canvas or OpenGL screenshot.
- **Four moving pawns:** `rekixo-immersive.js` uses the real source `TRACK`, `START_OFFSETS` and `axisBoundary` formula. Pawns' visual faces are crops of the official branch artwork.

## Honest limitations / next fidelity level

The latest Android animal pawns are procedural GLES30 models. The branch includes `LudoPaws3DSceneRenderer.kt`, character renderers (Dog, Cat, Duck, Goat plus new animals) and `LudoPawsCharacterPortraitBitmapCache.kt`, but **no exported PNG, transparent animated sprites or GLB** of those runtime models. Reproducing those pixels requires running Android's actual renderers with EGL/Android SDK and exporting authenticated screenshots/sprite sequences. The current website environment has no Android SDK/emulator. Do not claim the browser SVG or promotional portraits to be native gameplay footage.

To upgrade later, capture an approved Android screenshot of the newest Classic/other board and transparent PNGs from the offscreen portrait renderer (`drawPortrait`). Replace the SVG/portrait art while keeping the path positioning and existing responsive/reduced-motion tests. Only make production availability claims after app-side verification.

## Web behavior and safeguards

- The homepage card's button plays a short illustrative dice turn. The initial automatic one-turn preview is disabled by `prefers-reduced-motion`; it never opens a WebSocket or connects to a multiplayer server.
- Animal pawns move through the actual 52-position Ludo route rather than the old arbitrary straight-line path.
- The current site uses a separate portfolio link. Keyboard, screen-reader live status and touch remain supported.
- Dark/light color schemes and shared page templates are unchanged.
- The site maintains the preceding `ludopaws-board.webp` file temporarily for cached HTML compatibility, but **new HTML does not reference it**.

## CI release gates
- Source tests lock the official promotional art's Git hash and confirm known Classic geometry constants.
- Chromium checks image load, four pawns, deterministic dice behavior and the computed route, alongside existing 22-page cross-theme QA.
- Production smoke checks the SVG, official WebP hash and updated JS on the live site, not merely the HTML status code.
