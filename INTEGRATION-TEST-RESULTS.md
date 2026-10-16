# Local integration verification — 16 October 2026

Production preparation follow-up: see `CMS-PRODUCTION-RELEASE.md` for the newer image-error and delayed-empty-response fixes, 205 mocked assertions, exact production-package live checks, Studio dependency findings, and revised staging/release gates. The earlier staged release described below does not yet contain those local fixes.

Status: **ready for an approved staging deployment and acceptance test**. Local integration enabled as requested; no deployment, hosting edits, CORS changes, or Sanity content writes performed by the agent. The owner published the projects and added the localhost CORS origin. `.cpanel.yml`, CSS, gallery markup, and original image files remain unchanged by this test phase.

## Final live-browser verification after owner CORS update

Live Chromium checks passed at 375px with touch emulation and 1440px desktop. Both reported `source: sanity`, four rendered cards, HTTP 200, four published projects and 25 photographs, with the exact allowed origin `http://localhost:8765`. The API and CDN responses were not mocked or proxied. Every one of the 25 photos loaded and decoded through the real lightbox at both widths. Project labels, photo counts/order, meaningful alt text, keyboard Enter/Space activation, forward/reverse wrapping, Tab containment, Escape, focus return, scroll unlocking, and mobile touch next/close passed: 174 interaction assertions on mobile, 173 on desktop.

Full-page text/layout and image geometry matched the static control at both widths; screenshot image pixels are excluded from exact pixel checks because CDN delivery and rasterization can differ. Original uploaded source hashes were previously confirmed for all 25 assets. Live and static gallery screenshots were also visually inspected for image content and crops. Screenshots are in `%TEMP%/spatium-live-checks`. These checks establish visual/layout parity within that scope, not byte-identical CDN images.

No Authorization or Cookie headers were sent in the public API requests; there were zero failed API requests, console errors, or uncaught page errors. The eight migration tests and 191 mocked browser assertions were rerun and passed, including unreachable-API fallback and successful-empty-response clearing. The source manifest and JavaScript syntax/whitespace checks also passed. No implementation blocker remains for staging. Physical iOS/Safari and Android checks and actual staging-origin/hosting behavior remain acceptance steps.

Next: obtain staging upload approval, confirm the exact staging document root, allow only `https://staging.3dspatium.hr` in Sanity CORS with credentials disabled, then upload the reviewed website files including both new gallery scripts through the approved staging workflow. Do not use the unchanged production-targeting `.cpanel.yml` for staging. Repeat the real-browser, fallback, and physical-device checks there before seeking production release approval. No deployment has been performed.

The remaining sections retain the earlier test history; their CORS and empty-publication blockers have now been resolved by the owner and verified above.

## Follow-up after owner publishing

The exact anonymous published query now returns **four projects and 25 photographs**, in project order 10/20/30/40 and photo counts 4/8/9/4. Titles and locations match the manifest. All 25 asset `sha1hash` metadata values match the original source files in order; all 25 image URLs returned HTTP 200. CDN-delivered bytes differ from the original WebP bytes (the sampled response is JPEG), so those responses are not claimed byte-identical. Live browser visual comparison remains pending.

The real local browser test still fails at both widths because Sanity does not allow `http://localhost:8765` through CORS. Requests contain no Authorization or Cookie headers, and the static fallback remains usable. Publication is no longer a blocker; only the CORS origin and subsequent live-browser acceptance checks remain. The initial empty-response observations below describe the state before the owner published the documents.

## Results

- Anonymous server-side GET of the exact public gallery query: HTTP 200, `result: []`. There are currently zero projects available through this published-only query. The user's successful draft verification is acknowledged, but does not establish published availability. No publishing was performed.
- Real Chromium browser at `http://localhost:8765`, widths 375 and 1440: Sanity request blocked by CORS (missing `Access-Control-Allow-Origin`). The original four-card static fallback remained present; no uncaught JavaScript errors. API requests were GET, requested `perspective=published`, and carried neither Authorization nor Cookie headers.
- Source manifest: four projects, 25 original files in 4/8/9/4 order; hashes and ordering passed. The unused `projekt1/5.webp` remains excluded.
- Eight migration tests passed, including preserving owner edits and blocking cross-type reserved-ID collisions. These use mocked requests; no migration was executed.
- 191 mocked browser assertions passed: all 25 photographs in both static and CMS modes, counters, wrapping, keyboard controls/focus trap/focus return, touch navigation, mobile menu, individual alt/caption values, unsafe URLs/text injection, network/HTTP/JSON/timeout fallback, and successful empty responses clearing the gallery.
- Desktop/mobile comparison against Git HEAD: text/layout and image geometry match at 375 and 1440 pixels. Image pixels are masked for the layout comparison because Chromium rasterization can vary; mocked CMS assets use the actual original local photograph bytes. Live Sanity asset loading and visual parity remain unverified because the public query is empty and browser CORS access is blocked.
- JavaScript syntax and Git whitespace checks passed. No frontend dependency or build step added. Existing browser tests now explicitly force the disabled configuration for their static-control case, independently of the locally enabled configuration.

## Reproduction

From the website folder:

```powershell
node migration/extract.mjs --check
node --test tests/migration.test.mjs
py -3.10 tests/gallery-browser.py
py -3.10 tests/gallery-live.py
```

The first browser suite intercepts external requests. The live test makes anonymous reads of Sanity and uses localhost port 8765; stop another server on that port before running it. It exits nonzero until the browser retrieves four projects and 25 photos successfully. Python Playwright/Pillow and Brave are reused from existing local test tooling; see the main integration guide for prerequisites.

## Next steps

1. Confirm in Studio whether the four imported projects are still drafts. If so, obtain explicit approval before publishing them. If they were already published, investigate the Studio project/dataset and document types; the observed query for `abufysa8` / `production` returned no published `galleryProject` documents. Do not weaken the published-only query or add a browser token.
2. After approval for Sanity project settings, allow the exact website test origin `http://localhost:8765` with credentials disabled. No wildcard or production origin is required for local testing. This has not been changed automatically.
3. Rerun `py -3.10 tests/gallery-live.py`. Require four projects, 25 photos, `source: sanity`, no browser credentials, and no page errors. Then repeat all 25 real-image navigation/decoding checks and desktop/mobile comparisons using the published Sanity assets; the current positive tests are mocked and cannot substitute for that acceptance pass.
4. Once local live checks pass, obtain staging deployment approval, confirm the staging document root, and allow `https://staging.3dspatium.hr` without credentials. Upload the reviewed website files, including `gallery-config.js` and `gallery-sanity.js`, through the approved staging workflow. The unchanged `.cpanel.yml` targets production and does not copy these new files; do not use it for staging.
5. On staging, verify actual API/image loading, keyboard and touch behavior, fallback, and physical iOS/Safari and Android. Keep empty-result tests mocked rather than unpublishing real content solely for testing. Obtain separate production approval afterward.

Rollback remains `enabled: false` with the original HTML gallery and local assets retained. The fallback is a historical snapshot: previously original projects may appear during an outage even if subsequently unpublished from Sanity. Review the static fallback separately if a permanent public removal is required.
