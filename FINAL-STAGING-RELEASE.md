# Final staging package — 16 October 2026

Prepared locally only; no upload, deployment, Sanity mutation, or hosting change occurred. `.cpanel.yml` remains unchanged. The user reports hosted Studio and production CORS are configured; neither was modified or retested as part of this packaging task.

## Release identity

- ZIP: `artifacts/3dspatium-staging.zip`
- External integrity/file manifest: `artifacts/3dspatium-staging.manifest.json`
- Size: **3,769,983 bytes**
- SHA-256: `d93158a196b2c0ee6a6226d76707b49f5fc7bb34c22ade858537efad35818098`
- Intended document root: `/home/dspatiumhr/staging.3dspatium.hr/`

This replaces the earlier staging ZIP and its checksum. It includes the reviewed image-error recovery and focused/open-lightbox empty-result race fix. The production ZIP was not rebuilt or changed during this task.

## Contents: 39 files, no wrapper directory

```text
index.html
privatnost.html
uvjeti.html
styles.css
myscript.js
gallery-config.js
gallery-sanity.js
.htaccess
robots.txt
sitemap.xml
slike/favicon.svg
slike/glavna.jpg
slike/logo-pozadina-alt.svg
slike/svg-logo/instagram.svg
slike/projekt1/1.webp through 4.webp
slike/projekt2/1.webp through 8.webp
slike/projekt3/1.webp through 9.webp
slike/projekt4/1.webp through 4.webp
```

The 25 fallback photographs match their original SHA-1 hashes and remain in 4/8/9/4 order. Unused `projekt1/5.webp` remains excluded and untouched locally. The staged `.htaccess` is the repository's existing host-scoped staging noindex/nosniff file, not a downloaded production hosting configuration. No `.user.ini`, `php.ini`, `.well-known`, `.cpanel.yml`, credentials, environment files, Studio, dependencies, migration tools, tests, scripts, or development documents are included. Preserve/review any existing staging-specific hosting rules before extraction.

All three packaged HTML pages retain staging-only `noindex, nofollow` metadata. Packaged robots.txt omits the production sitemap advertisement; styles/scripts use content-hash cache versions. Existing canonical and sitemap URLs still identify production. This ZIP must not be used for production.

`gallery-config.js` has `enabled: true`, project `abufysa8`, dataset `production`. Both gallery scripts, `myscript.js`, and `styles.css` are byte-identical between the new staging ZIP, the final production ZIP, and current reviewed source. Environment-specific packaging differences are HTML indexing metadata, robots.txt, and the staging `.htaccess`; gallery behavior is the same.

## Verification

- Eight migration safety tests: passed; requests mocked, no actual migration.
- 205 browser assertions: passed, including image errors, unavailable API fallback, and successful-empty-data clearing with an active fallback lightbox.
- Exact extracted staging ZIP: **347 live interaction assertions passed** (174 at 375px touch emulation, 173 at 1440px desktop). Four projects and 25 photographs loaded directly from Sanity (`source: sanity`), all photos decoded, and text/layout/image geometry matched the static control. API requests contained no Authorization or Cookie headers; no API failures, console errors, or page errors.
- Archive integrity, allowlist/path validation, all photo hashes, enablement, indexing metadata, package/source parity, JavaScript syntax and Git whitespace: passed.
- **No test failures.** Physical-device and remote staging-host acceptance remain after the separately approved upload. No pixel-identical CDN image claim is made; image geometry and static text/layout are compared separately.

The existing `STAGING-DEPLOYMENT.md` remains the File Manager/backup/rollback procedure, but use the release identity above rather than its historical initial ZIP checksum. Do not use cPanel Git Deploy: `.cpanel.yml` targets production. No deployment is authorized by this preparation task.
