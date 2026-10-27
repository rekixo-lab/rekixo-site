# REKIXO Immersive Studio — Production Design Blueprint

**Date:** 27 October 2026  
**Audience:** REKIXO company visitors, potential customers, partners, and technically minded evaluators.  
**Principle:** Show the thinking of an independent software product developer without fabricating team size, customers, usage metrics, product release status, security certifications or technology screenshots.

## Visual art direction
- Dark cinematic background (#050c17) with restrained mint (#6af8ce), cool blue (#6bafff) and violet (#b49aff).
- Crisp system sans for editorial typography; system monospace for code, metadata and engineering examples. No external font downloads or animation libraries.
- CSS-only product illustrations for initial load; transforms and opacity for animation. The homepage uses independent, versioned CSS/JS to avoid unexpected impact on contact/billing or product routes.
- Preserve the existing global shell and light/dark toggle while restyling homepage navigation and footer to match.
- All animation respects `prefers-reduced-motion`, keyboard and screen-reader flows; content remains understandable without animation.

## Information architecture

| Order | Section | Desktop arrangement | Mobile behavior | Purpose |
| --- | --- | --- | --- | --- |
| 1 | Hero | 2-column headline and illustrative code editor | 1-column, full-width buttons | Credible developer-first introduction |
| 2 | Discipline ribbon | Compact technical topics | Horizontally scrollable within its own ribbon | Reinforce breadth without invented badges |
| 3 | Products | Five distinct illustrative cards in a responsive grid | One column | FinWorkar, AR3D, GeoLive, LudoPaws, EntroNex |
| 4 | AR3D showcase | Product benefits beside masterplan **asset slot** | Stacked | Room for actual project render |
| 5 | Engineering workbench | Explainer beside keyboard-operable tabs | Stacked | Describe interface, backend, release |
| 6 | Selected engineering | Three service cards | Stacked | Contextual custom work offer |
| 7 | Process | Four-step horizontal timeline | Vertical | Show realistic engineering lifecycle |
| 8 | CTA | Large gradient call-to-action | Full-width buttons | Contact and email |
| 9 | Footer | Four link groups | Responsive columns | Product/policy navigation |

## Real-estate asset ownership and placement
- Homepage placeholder selector: `[data-rx4-asset-slot="ar3d-masterplan"]`.
- Replace the **inside of the placeholder stage** (`.rx4-placeholder-stage`) with a verified, owned, high-resolution screenshot, property masterplan or approved render.
- Keep original source and attribution/rights as necessary. Suggested descriptive filename: `public/ar3d-showcase/your-approved-project.webp` with responsive `srcset` only when authentic variants exist. Set `loading="lazy"`, `decoding="async"`, dimensions and truthful alt text. Do not upscale thumbnails or imply a 3D capability unavailable on that project.
- Product-card diagrams are clearly illustrative, not real plot inventory or active project data.
- Existing AR3D detail page retains its original approved screenshot gallery and zoom links; no customer media changed by this release.

## Technical implementation
- `public/index.html` — new narrative, visual semantic structure, SEO and accessible workbench controls.
- `public/rekixo-immersive.css` — isolated styling, continuous background animation, responsive layouts and reduced motion.
- `public/rekixo-immersive.js` — accessible tab activation, desktop-only pointer tilt and motion fallback.
- Existing `rekixo-v3.js` handles global header, theme toggle, footer, scroll reveals and mobile navigation.
- Existing `scripts/browser-ui-check.mjs` is extended with premium-homepage visual invariants. All checks are local, never make genuine customer submissions.

## Not changed
- `worker/` APIs, Cloudflare Workers/D1 bindings or migrations.
- Existing contact form and paid Razorpay checkout/recovery, Gmail and payment secrets.
- Product-specific application repositories, app-store claims or private data.
- Legal and privacy copy, pending independent approval.

## Release gates
1. Static link/security validation plus Node source tests.
2. Chromium tests across 320, 360, 390, 430, 768, 820, 1024, 1440 and 1920px. Include no overflow, visible content, keyboard tabs, theme and mobile navigation.
3. PR review and CI before the production-connected `main` merge.
4. Cloudflare Workers production build for the exact merge SHA.
5. Read-only production checks for the new homepage signature and its two versioned assets plus existing health/auth boundaries.
6. Manual design and device review before replacing placeholder content with a real AR3D visual.

## Deferred
- Add approved original AR3D screenshot/render; optionally add a WebGL/GLB preview only after a verified source asset and accessible static fallback are available.
- Product-specific screenshots, metrics or testimonials only when verified and permissioned.
- Extend the illustrated system beyond the homepage after review of the actual individual product pages.
