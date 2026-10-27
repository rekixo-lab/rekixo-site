# REKIXO product catalog, IP boundaries and release truth

**Internal editorial checklist; evidence snapshot: 26 October 2026.**
Do not turn a repository feature inventory into an unconditional public availability claim.

| Product family | Repositories | Product role | Source of release truth |
| --- | --- | --- | --- |
| FinWorkar | `finworkar-android`, `finworkar-backend`, `Finworkar-web` | Android marketplace, Firebase backend and web presence | Official Play listing; matching Android/backend release; published privacy and deletion flow |
| Rekixo AR3D | `rekixo-ar3d-platform`, `rekixo-ar3d-engine` | Multi-tenant real-estate platform and isolated 3D engine | Per-project published status, control-plane acceptance and Engine release |
| GeoLive | `rekixo-geolive` | Project-scoped location API, developer dashboard and integrations | Cloudflare deployment/onboarding runbook; runtime parity gates |
| LudoPaws | `ludopaws`, `ludopaws-website` | Android multiplayer Ludo, game backend and website | `docs/production-readiness/RELEASE_STATUS.hi.md`, official Google Play approval and listing |
| EntroNex | `entronex` | Cryptographic outcome infrastructure; pre-independent-audit | README release candidate + independent review before commercial security assurances |
| Parent website | `rekixo-site` | Company identity, marketing, contact flow and policies | Merged source, GitHub CI and actual Worker deployment |

## Editorial truth rules
- Every public `Live` badge or Download button requires a verified publicly accessible destination and release evidence.
- `Source implemented`, `Tested`, `Deployed`, `Store review`, and `Publicly available` mean different things.
- Mark manual readiness states with an evidence date and review them after each release.
- Never publish private repository contents, credentials, customer tenancy data, unreleased artwork or protected documentation.
- Do not imply independent audit, guaranteed randomness, universal 3D generation, security certification, active customer count, business revenue or company registration without evidence.
- Public GitHub visibility is not itself an open-source license. Decide licenses and trade-secret boundaries intentionally.
- Keep existing Cloudflare Workers, R2, D1 and tenant identifiers stable unless a separately tested migration explicitly authorizes changes.

## Responsibilities
- Parent site: company identity, five-family catalog and general contact.
- Each product: consumer/product privacy, terms, support, consent, deletion, billing, help and release status as applicable.
- Each repo: README, owner, security workflow, changelog/release evidence, dependency review, rollback and backup procedure.
- Each data controller: identify the legal controller, processors, retention schedule, access/deletion flow, incident response and relevant agreements before taking customer production data.

## Review gates
1. Code checks (lint, unit, integration, relevant security tests).
2. Browser and real-device UX checks, with no production purchases/submissions in CI.
3. Release-specific data processing and Terms/Privacy/Play Console alignment.
4. Documentation and product availability check.
5. Operator approval of the relevant deployment and a tested rollback plan.
6. Post-deploy smoke that confirms **the deployed version** rather than only an earlier live response.

## Cross-repo rollout and compatibility
FinWorkar feedback-removal: deploy/test `finworkar-backend` deletion gating change first; then Android and consumer website updates; ensure the old app/backend error fallback remains usable during rollout.

LudoPaws copy alignment: update README and website/status pages; do **not** alter signed Android package, Play tracks, game API or monetary entitlements in a marketing/content PR.

GeoLive: do not mix PostgreSQL/Redis legacy and Cloudflare D1/DO production datasets.

AR3D: the platform and 3D engine have separately isolated state and deployments; customer projects are tenants, not copies of repos.

EntroNex: keep research status/pre-audit disclaimers, avoid premature commercial or gambling certification claims.

## Content audit cadence
Review product status immediately after a confirmed release; quarterly review general claims and legal contact details; review data processing providers upon material implementation changes. Record approved copy and evidence in the appropriate repo.
