# Staging-only deployment handoff

For the latest rebuilt release, use `FINAL-STAGING-RELEASE.md`: ZIP SHA-256 `d93158a196b2c0ee6a6226d76707b49f5fc7bb34c22ade858537efad35818098`, 3,769,983 bytes. This supersedes the historical initial ZIP identity below and includes the audited image-error and empty-gallery race fixes.

This is preparation, **not deployment authorization**. No upload, Git push/deployment, hosting update, Sanity write, or remote CORS change was performed. The owner confirmed the separate roots:

| Environment | URL | Document root |
|---|---|---|
| Staging — only permitted target in this procedure | `https://staging.3dspatium.hr` | `/home/dspatiumhr/staging.3dspatium.hr/` |
| Production — do not select | `https://3dspatium.hr` | `/home/dspatiumhr/public_html/` |

The repository's `.cpanel.yml` targets production and remains unchanged. **Do not click Update from Remote, Deploy HEAD Commit, or use cPanel Git Version Control for this staging release.** A Git commit is not a staging deployment boundary. No remote Git action is needed.

## Prepared release and audit

Recommended method: upload the allowlisted ZIP using cPanel File Manager, with an explicitly checked extraction destination. This bypasses the production deployment configuration and keeps development material out of hosting. cPanel documents [uploading, compressing and extracting files](https://docs.cpanel.net/cpanel/files/file-manager/110/).

Local artifacts:

- `artifacts/3dspatium-staging.zip` — the only local artifact to upload.
- `artifacts/3dspatium-staging.manifest.json` — external file list, per-file SHA-256, archive checksum, intended destination. Keep outside the web root.
- `scripts/package-staging.py` — reproducible local builder, never connects to hosting.

The ZIP contains **39 files** at site-root-relative paths, with no enclosing folder and no absolute or parent-traversal paths:

| Content | Exact files |
|---|---|
| Pages | `index.html`, `privatnost.html`, `uvjeti.html` |
| Styles and browser scripts | `styles.css`, `myscript.js`, `gallery-config.js`, `gallery-sanity.js` |
| Web-server/search resources | `.htaccess`, `robots.txt`, `sitemap.xml` |
| Shared graphics | `slike/favicon.svg`, `slike/glavna.jpg`, `slike/logo-pozadina-alt.svg`, `slike/svg-logo/instagram.svg` |
| Static fallback photos | `slike/projekt1/1.webp`–`4.webp`; `slike/projekt2/1.webp`–`8.webp`; `slike/projekt3/1.webp`–`9.webp`; `slike/projekt4/1.webp`–`4.webp` |

Excluded: `.cpanel.yml`, `.git`, environment files (including examples), credentials, Studio and its generated files, dependencies, migration code/manifests, development documents, scripts, tests, reports, editor files, generated artifacts, unused `slike/projekt1/5.webp`, and unused `slike/logo.png`. Excluded images remain untouched locally. No recursive workspace copy or Git archive is used: the builder uses an explicit allowlist.

`gallery-config.js` is enabled and points at `abufysa8` / `production`, API `2025-02-19`. It contains public identifiers only. The browser uses anonymous requests, `credentials: omit`, and the published perspective. No API token or frontend build system is needed. Staging uses the **same published dataset**, not a separate test dataset; do not edit/unpublish real projects merely to run acceptance checks.

Relative CSS/JS/image URLs and root-relative legal-page links resolve under the staging subdomain when deployed at its document root. Existing canonical, social metadata, JSON-LD, and sitemap URLs deliberately continue to identify production. They are not gallery fetch endpoints or navigation redirects. Form submissions still target the real Formspree endpoint; do not send a test message without separate authorization.

Only the packaged copies receive these reproducible staging adjustments:

- Each HTML page gets `noindex, nofollow` metadata. The existing `.htaccess` already adds an `X-Robots-Tag` for the exact staging host when Apache modules allow it. Verify the real header after upload; noindex is not access control.
- CSS/JS query versions derive from their content hashes on all three pages, avoiding stale caches (including the legal pages' shared script).
- Packaged `robots.txt` allows crawlers to read noindex directives and omits the production sitemap advertisement. `sitemap.xml` remains the existing production sitemap; do not submit staging to search engines.

Source HTML, CSS, browser JS and original images are not rewritten by packaging. The archive is **staging-only** because of its noindex metadata; never upload it to production.

## Rebuild and review locally

From PowerShell:

```powershell
Set-Location -LiteralPath 'C:\Users\User\Documents\Work\Web_Page_3DSpatium'
node migration/extract.mjs --check
py -3.10 scripts/package-staging.py
Get-FileHash -Algorithm SHA256 -LiteralPath '.\artifacts\3dspatium-staging.zip'
Get-Content -LiteralPath '.\artifacts\3dspatium-staging.manifest.json'
```

These commands run locally only. The builder checks source photo hashes, integration enablement, references, likely credential literals, ZIP integrity, and that `.cpanel.yml` still matches Git HEAD. Two consecutive builds produced the same archive hash. Compression output is reproducible in the same Python/zlib environment; compare the current manifest after any rebuild or source change.

Initial ZIP: 3,769,481 bytes, SHA-256 `c52f2dadbbf70276e0be2c1af5190e2c8095f692231d13f0c5d8794eae0766e6`. Rebuilding changed source creates a different release: review and retest it, then use its newly printed checksum.

The extracted ZIP was served locally and passed all 347 live interaction assertions (174 mobile, 173 desktop). Both widths returned `source: sanity`, four projects and 25 photographs, matched the static text/layout and image geometry, and had no API failures, console errors, page errors, Authorization headers, or Cookie headers. This validates the packaged files, not the as-yet-unmodified remote staging server.

## CORS prerequisite — user action only

The read-only staging-Origin probe returned **HTTP 403**, without `Access-Control-Allow-Origin`. Do not treat working localhost CORS as staging access. No remote setting was changed. In [Sanity Manage](https://www.sanity.io/manage/project/abufysa8), select project `abufysa8`, open **API → CORS origins → Add CORS origin**, enter exactly:

```text
https://staging.3dspatium.hr
```

Leave **Allow credentials disabled** and save after authorizing the setting change. If already listed, inspect spelling, HTTPS, and credentials rather than adding duplicate entries. Do not add a path, wildcard, www-staging alias, API hostname, or image CDN hostname. No additional origin is required by this release: existing localhost and Studio origins serve their separate existing purposes. Sanity's [CORS guide](https://www.sanity.io/docs/content-lake/cors) describes origin management.

## cPanel procedure — execute only after explicit deployment approval

1. In cPanel **Domains**, confirm staging's document root is `/home/dspatiumhr/staging.3dspatium.hr/` and HTTPS is valid. Do not edit domain roots, redirects, DNS, PHP, or SSL settings as part of uploading. If staging redirects to production or shares a symlink into production, stop for review.
2. Open **Files → File Manager → Settings → Show Hidden Files (dotfiles)**. Navigate using the full path field to `/home/dspatiumhr/staging.3dspatium.hr/`. Confirm the path bar shows that exact directory, not `public_html`, `www`, or a symlink to either. The account has authority to overwrite production if the wrong path is selected; the ZIP cannot prevent a human choosing the wrong target.
3. Back up **the existing staging contents only**, including `.htaccess` and any other dotfiles. From inside that staging root choose **Select All → Compress → Zip Archive**, and use an archive destination outside every document root, e.g. `/home/dspatiumhr/staging-before-sanity-20261016-01.zip`. Use an unused name. Confirm the selection/path before compression. Download this backup and inspect it locally: it must contain the old staging files at the archive root, including its homepage and `.htaccess`, rather than an extra wrapper folder. Confirm it opens and is nonempty. Keep a screenshot of the original staging path/file list and note any files absent from the backup. If compression cannot save outside the web root, stop and choose a verified private backup location; do not leave backup ZIPs publicly accessible.
4. Download the current staging `.htaccess` separately. Compare it with the packaged `.htaccess` before replacement. If it has hosting-specific authentication, redirects, caching, rewrites, or other rules, stop and prepare a reviewed merged staging `.htaccess`; do not overwrite unknown rules. Preserve cPanel-managed `.well-known` and other unrelated hosting files; there is no whole-directory deletion in this procedure. If Directory Privacy is in use, preserve its configuration and retest the authenticated staging login.
5. Create a private holding folder `/home/dspatiumhr/staging-release-review/` in File Manager, outside both document roots. Open it, choose **Upload**, and select only `3dspatium-staging.zip`. Do not upload the repository folder, manifest, Studio, backup, or credentials. Confirm the uploaded filename and byte size. If cPanel cannot compute a hash, download the uploaded ZIP and compare its SHA-256 locally with the release manifest before extraction.
6. Back in that private holding folder select the uploaded ZIP → **Extract**. Replace the destination with **`/home/dspatiumhr/staging.3dspatium.hr/`**. Read the entire destination before clicking **Extract Files**. It must contain `staging.3dspatium.hr`, must not contain `public_html`, and must not be merely `/home/dspatiumhr/`. Cancel if the UI proposes any other destination or the archive listing differs from the 39-file manifest. Extraction can overwrite staging files and briefly expose a mixed release; do this during an agreed staging test window, with nobody editing staging concurrently.
7. Inspect the extraction result for errors. Open the staging root and verify `index.html`, `.htaccess`, `gallery-config.js`, `gallery-sanity.js`, and `slike/` are directly inside it (no nested `Web_Page_3DSpatium` or package directory). Verify config says `enabled: true` and `abufysa8` / `production`. Do not loosen permissions to 777; normal files are packaged with mode 0644. Any hosting permission error needs review.
8. Hard-refresh staging with DevTools **Disable cache** enabled. Run every acceptance check below. If a cache purge is needed, scope it to staging; do not purge or reconfigure a shared production cache. Do not press any cPanel Git deployment buttons. Keep the private backup and release archive until acceptance is signed off.

The separation above prevents production writes when followed exactly: the package contains no deployment script or hosting command, and every file operation has an explicit staging destination. It does not remove the need to check each File Manager path. Never use `public_html` as a shortcut to staging.

## Staging acceptance checklist

Record results, screenshots, device/browser versions, and any failures. Use a private/incognito browser session to check anonymous behavior.

1. **HTTPS and indexing:** open `https://staging.3dspatium.hr/`, `/privatnost.html`, `/uvjeti.html`. Require valid TLS, HTTP 200, no redirect to production, correct JS/CSS MIME types, and no missing assets. In DevTools Network inspect the document's `X-Robots-Tag: noindex, nofollow` and View Source for the packaged robots meta tag. If the Apache header is absent, retain the meta tag but investigate hosting module/rule behavior before signoff. Noindex does not make staging private.
2. **Actual Sanity source:** after load, DevTools Console:

```javascript
const grid = document.querySelector('.portfolio-grid');
({source: grid.dataset.source,
  projects: grid.children.length,
  photographs: [...grid.querySelectorAll('.pf-img img')]
    .reduce((n, image) => n + (image.galleryPhotographs?.length || 0), 0)})
```

Expected `{source: 'sanity', projects: 4, photographs: 25}`. The four original cards alone are insufficient proof because fallback also has four. Inspect the real API request: status 200, `perspective=published`, staging allow-origin, and no Authorization/Cookie headers. Inspect thumbnail/modal URLs: `https://cdn.sanity.io/images/abufysa8/production/…`, not local `slike/projekt…`.

3. **Content/order:** PAG / Stambena zgrada (4), ZAGREB / Poslovna zgrada (8), OSIJEK / Obiteljska kuća (9), OSIJEK / Obiteljska kuća (4), project order 10/20/30/40. Open each and view every image in original sequence, checking counters and successful decoding. No placeholders or unused fifth project-1 image.
4. **Appearance:** compare staging and production side by side at matching 1440px and 375px widths, same zoom/font environment. Check typography, spacing, colors, grid, image crops, reveal animations and reduced-motion behavior. CDN compression can differ from local image bytes; layout/crops must match. Include 320px/768px and the 800/801px navigation breakpoint as spot checks.
5. **Interactions/accessibility:** open every project with mouse and Enter/Space; verify meaningful alt text, initial close-button focus, Tab/Shift+Tab containment, next/previous arrows and buttons, wrapping both directions, Escape, backdrop and close-button dismissal, return to the initiating thumbnail, and restored page scrolling. Test rapid close/reopen and orientation/resize. On a touch device test thumbnail, next/previous, close and page scrolling.
6. **Fallback, no remote changes:** in Chrome/Brave DevTools Network request blocking, block `*abufysa8.api.sanity.io*`, then reload. Require `source: fallback`, four original static cards, all 25 local photos, and usable lightbox. Remove the blocking rule and reload; require `source: sanity` again. An expected blocked-network error during this test is not an unexplained failure.
7. **Successful empty data, browser-local simulation only:** do not unpublish real projects. In Chromium DevTools **Sources → Overrides**, choose a temporary local folder and allow it; locate the Sanity query in Network, right-click **Override content**, replace only the local response body with `{"result":[]}`, and reload. Require `source: sanity`, zero cards, no static originals restored. Disable/remove that response override and reload; require 4/25 again. If response overriding is unavailable, use the existing local automated browser suite instead and record that the empty-response test was not run on staging. Never alter a request's server-side content or use a write token for this check.
8. **Unrelated features:** desktop/mobile navigation, all anchor links, logo/home links, legal pages and their menus, footer, social links, contact fields and client validation. The form still targets real Formspree; use a locally intercepted request or obtain separate permission before submitting a real test message. Do not send production messages merely as a release check.
9. **Security/network:** no secrets in page source/config, no unexpected requests to a CMS write endpoint, no credentials in public API requests, no unexplained console errors, 404s, failed image loads, mixed content, or CORS errors. The package must not expose `.git`, `.env`, Studio, migration manifests, or tests. Review the actual file list rather than assuming a clean root—old files can predate this package.
10. **Physical final acceptance:** current Safari on iPhone and Chrome on Android, including menu, orientation, all gallery controls, scroll locking/restoration, slow connections and refresh. Chromium emulation is not Safari/device certification. Perform a screen-reader spot check where available.

Existing automated checks: eight migration safety tests, 191 mocked browser assertions (including failure and empty data), and 347 live interaction checks at mobile/desktop. The extracted staging ZIP is also exercised with the live-browser suite before handoff. Automation cannot establish cPanel Apache behavior, real staging headers, physical devices, actual mail delivery, or the human extraction destination. No additional content publishing is needed for staging testing.

## Rollback — staging only

For a gallery-only issue, the fastest reversible option is editing **staging's** `gallery-config.js` in File Manager to `enabled: false`, then updating the `gallery-config.js?v=…` query version in **staging's** `index.html` to a fresh value and hard-refreshing. This restores the retained static gallery and 25 local images without Sanity deletion. It does not undo the entire release.

To restore the previous staging site completely:

1. Save diagnostics and confirm `/home/dspatiumhr/staging.3dspatium.hr/` again. Do not open `public_html` or cPanel Git deployment.
2. Select the verified private `staging-before-sanity-…zip` backup. Confirm its entries have no wrapper and are the old staging contents. **Extract only into `/home/dspatiumhr/staging.3dspatium.hr/`**, overwriting the release with the old files, including homepage, assets, and `.htaccess`. If its structure differs, stop and review the destination rather than guessing.
3. Compare the restored directory against the backup. New release-only files such as `gallery-config.js` and `gallery-sanity.js` can remain inert if old HTML does not reference them. For an exact file-list restoration, move only files proven absent from the backup into a private holding folder outside all web roots, after checking their resolved locations remain within staging. Never recursively delete the staging root, `slike/`, or any production directory. Preserve unknown pre-existing hosting files.
4. Hard-refresh and verify the previous staging behavior, navigation, original gallery and local images. Remove test overrides/blocking rules. Do not delete Sanity documents/assets or revoke owner access to roll back a frontend release.

## Production hazards and outstanding gates

Every possible production-affecting step is excluded: cPanel Git Deploy HEAD targets production; extraction/copy into `public_html` would overwrite it; editing shared redirects, DNS, SSL, Apache parent configuration or broad cache rules could affect it; modifying the shared `production` Sanity dataset could alter any enabled frontend; real Formspree submissions send real messages. None is part of this procedure. Directory Privacy changes also need separate review because they can rewrite `.htaccess`.

Still required before staging upload: explicit deployment approval, staging CORS confirmation after the user configures it, a verified staging backup, review of existing staging `.htaccess`/symlinks/hosting files and available storage. The document-root paths are user-confirmed; the agent has not logged into cPanel or verified those paths remotely. The File Manager account's permissions and extraction behavior remain manual checks. Physical device acceptance remains after upload.

Prepared only. Stop here until deployment is explicitly approved.
