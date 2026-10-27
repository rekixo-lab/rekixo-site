# LudoPaws homepage — user-approved illustrated board

**Updated:** 27 October 2026

## Approved website artwork

- The website homepage now uses the exact *composition* the owner selected in chat: the 1254×1254 recreated, colorful garden-style LudoPaws board with **four goats, four ducks, four dogs and four cats**.
- Original supplied image: 1254×1254 PNG. The website uses a 640×640 responsive AVIF export for a smaller download. The image layout and contents were **not reillustrated or cropped**. It is an optimized raster derivative, not a pixel-identical file copy.
- Deployment asset: `public/ludopaws-user-board-640.avif`; expected size 24,502 bytes, Git object SHA `9dc23518f72968936919cb156ed76f824322e321`.
- Homepage references the AVIF directly; CSS uses `object-fit:contain` on a square board frame to preserve all four corners and the complete center.
- Earlier website screenshot (`ludopaws-board.webp`) and code-derived SVG (`ludopaws-classic-code-preview.svg`) remain in the repository only for old URL compatibility, but are **not used by the active homepage**.

## Interaction

- The square illustration is visible immediately: all 16 animals are already part of the image. Four optional moving token overlays are hidden at rest.
- On the first click, tap, Enter or Space, the game preview rolls the dice and reveals a small moving character. Subsequent interactions show other team turns. This is a **local demonstration**, never a live multiplayer match.
- Overlays use the displayed board image itself for their illustrative animal-face crops, rather than mixing characters from another marketing asset.
- Motion-enabled visitors may get one automatic demonstration when the board becomes visible; no endless animation loop. The reduced-motion preference suppresses this automatic playback.
- Logical moves follow LudoPaws' 52-position track and team entry offsets, translated to the **displayed illustration's** 6+3+6 grid and three equal physical regions; this differs from the previously rendered board's erroneous percentage math.
- Screen-reader label and an `aria-live` status keep the button understandable. Portfolio navigation uses its own ordinary link.

## Guardrails

- No Android gameplay repository, multiplayer backend, service worker, payment, contact or policy API changes.
- The illustration is a recreated artwork approved by the owner, **not a claim of actual Android GPU-rendered gameplay footage**.
- Static tests require the exact AVIF Git blob hash, correct references, no surprise crop and no third-party game traffic.
- Chromium checks a loaded 640×640 image, click-to-dice movement, four team tokens, dark/light modes and all shared page breakpoints.
- Production smoke must confirm the new image's MIME type, magic bytes and SHA before declaring the website deployed.
