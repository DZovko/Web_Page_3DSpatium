# CMS production audit and release handoff — 16 October 2026

**Prepared locally; production release is gated.** No Studio deployment, cPanel upload, Git deployment, Sanity content mutation, remote CORS change, or production hosting change was performed. `.cpanel.yml` is unchanged and must not be used for this release.

## Audit outcome

| Area | Result |
|---|---|
| Project/dataset | Both repositories use `abufysa8` / `production` |
| Existing content | Four published projects, 25 photos, source asset hashes previously matched; original local files retained |
| Studio schema | Gallery only; title/location/order, optional category, ordered photos with alt and optional captions; native draft/publish/unpublish/delete actions enabled |
| Actual owner permissions | Not verifiable from source; owner login and role acceptance required |
| Public API | Published perspective, draft/release exclusions, explicit project order then ID; authored photo-array order preserved |
| Rendering/security | DOM nodes and `textContent`, no CMS `innerHTML`, restricted HTTPS Sanity image host/project/dataset; no browser token found |
| Failure handling | Eight-second API timeout; static fallback on HTTP/JSON/network/malformed/missing-reference errors; accessible message on image-download failure; empty successful result clears gallery, including a focused/open static lightbox |
| Indexing | Production homepage has no noindex; original legal pages intentionally retain `noindex, follow`; production canonical/structured-data/social URLs and robots/sitemap preserved |
| Production CORS | Both canonical and www Origin probes returned HTTP 403; canonical website origin must be allowed before activation |
| Studio dependencies | Parser advisories reduced from 11 to three; remaining one high/two moderate in CLI paths require review, not a clean audit |
| Deployment | Production-specific ZIP, no server-managed files, no deployment script, content-hashed script/style versions |

Anonymous read-only release comparison confirmed staging serves the gallery config and loader with its noindex header/meta. The exact versioned staging shared script contains delegated gallery binding and per-photo metadata support. Production still serves the old static homepage and shared script, and returns 404 for both new gallery scripts. Production homepage has no observed noindex header. Cloudflare injects its email script and serves different cached variants for bare/versioned URLs; byte-different HTML alone is not evidence of functional drift. The revised local code adds the two failure safeguards described below and is therefore newer than the currently approved staging release.

Existing staging CSS fetched at its versioned URL matches the reviewed local CSS; production served a different CSS byte sequence. Do not assume that copying the whole local site is a gallery-only production diff solely from URLs. Compare the complete revised staging release to production visually and review any intended non-gallery release differences before approval. No CSS edits were made in this production preparation phase.

## Local fixes explained and implemented

1. A successful gallery API response previously could leave broken thumbnails/modal images if an asset download failed. A failed cover now displays an accessible Croatian message while preserving its existing thumbnail control so other photos remain reachable. Failed modal images show an explanatory caption while navigation/close remain available. Normal loaded-image appearance is unchanged; no placeholder photographs are introduced.
2. An empty response previously could be bypassed by the focus-preservation guard if a visitor opened the fallback gallery before fetch completion. Empty results now close that lightbox, move focus to the portfolio heading, and remove the static cards. Nonempty late responses still avoid detaching an active trigger; that session stays static until refresh. Source diagnostics distinguish this with `source: static`.
3. Studio CLI transitive overrides patch `js-yaml@3` to 3.15.2 and `smol-toml@1` to 1.9.0; pnpm lockfile updated. Automatic Studio runtime updates are disabled so explicit reviewed builds are deployed. No major Sanity/React upgrade was attempted.
4. The existing local builder now accepts `--target production`; production output excludes `.htaccess` and all other server-managed files. It never connects to hosting and still verifies `.cpanel.yml` against Git HEAD.

Studio details, remaining advisories, login/deploy commands and access checks are in sibling `studio-3dspatium/HOSTED-STUDIO.md`. Croatian owner instructions are in `OWNER-GUIDE.md`. The owner can remove/reorder photo entries without deleting shared media-library assets. Deleting the last photo prevents Studio publication; deleting a project requires the appropriate user permissions. Studio UI restrictions do not replace Sanity authorization.

## Behavior, image delivery and caching

- Static originals stay visible during API loading. Failed/malformed responses preserve the entire static gallery; a successful `[]` removes it. A missing image reference counts as malformed data. A valid URL with a failed CDN download displays the new error state rather than pretending the whole API is unavailable.
- Public content is assigned through safe DOM properties. Project labels, captions, and alt text do not execute HTML/JavaScript. Only HTTPS URLs on the project's Sanity CDN image path are accepted. This does not replace editorial permissions or make previously public asset URLs private.
- Cover images are lazy-loaded, have explicit dimensions, and retain existing CSS crops. Assets use Sanity's CDN, while lightbox downloads follow navigation. No new lossy resize/crop or responsive `srcset` transformation is introduced in this release, preserving the reviewed appearance. Very large future owner uploads can still create a performance cost; use appropriately sized photos or consider a separately tested thumbnail optimization later. The original local fallback remains about the same asset footprint as before.
- Gallery queries use the direct API, explicit `published` perspective, `cache: no-store`, no credentials and no API CDN. Each page load fetches published data. Already-open pages do not live-update; refresh to see publishing/reordering. Network/indexing propagation can still delay an update; there is no promised subsecond guarantee.
- Packaged CSS/JS URLs use content hashes on all pages. New versions avoid stale old scripts, including the legal pages' shared script. Check actual HTML responses and CDN/browser cache behavior after release. Never cache query responses through an added worker/proxy as part of this release.
- The static fallback is an intentionally retained historical snapshot. Original projects can reappear during API failure even if later unpublished/deleted in CMS. For a permanent public removal, update the reviewed fallback and local files separately. This release does not claim confidentiality for formerly public content.

## Verification results and honest limits

- Eight migration tests passed; none executed a real migration.
- 205 mocked browser assertions passed, including all image/order interactions, network/HTTP/JSON/timeout fallback, unsafe text/URLs, missing references, failed CDN images, and delayed empty results with an open static lightbox.
- The **exact final production ZIP** was extracted locally and passed 347 live interaction assertions (174 at 375px touch emulation; 173 at 1440px). Both widths fetched 4/25 directly from Sanity, decoded every image, matched static text/layout and image geometry, and sent no Authorization/Cookie headers. No API failures, console errors, or uncaught page errors occurred. Actual image pixels can vary through CDN conversion/rasterization; no byte-identical JPEG/WebP claim is made.
- Studio lint, TypeScript, schema extraction (`--force` after the initial existing-output error), TypeGen and build pass. Dependency audit **fails intentionally/nonzero** with the documented residual findings; do not describe it as passed.
- Source/photo hash manifest, JS syntax, ZIP integrity, expected local resource paths, likely credential-literal scans, and Git whitespace checks pass. No credential environment files are tracked; `.env` patterns are ignored in both repos. Environment identifiers are public; do not introduce private values via `SANITY_STUDIO_*` or public gallery config. Pattern scans are not a guarantee against every future secret.
- Real owner login/role permissions, Studio hosted URL/app ID, current cPanel file metadata/private configuration/backup integrity, physical Safari/iPhone and Android behavior, and actual mail delivery remain manual checks. No live messages were sent.

## Production package

Artifacts (local only): `artifacts/3dspatium-production.zip` and `artifacts/3dspatium-production.manifest.json`. ZIP has **38 public files**, no wrapper directory:

| Group | Files |
|---|---|
| Pages | `index.html`, `privatnost.html`, `uvjeti.html` |
| Assets | `styles.css`, `myscript.js`, `gallery-config.js`, `gallery-sanity.js` |
| Search resources | `robots.txt`, `sitemap.xml` |
| Shared images | favicon, hero image, logo SVG, Instagram SVG |
| Fallback | All 25 original gallery WebP files, in their original paths |

Excluded: `.htaccess`, `.user.ini`, `php.ini`, `.well-known`, `.cpanel.yml`, all unlisted hosting files, Studio, dependencies, developer docs/scripts/tests, environment files, credentials, migration tooling, unused images. Extraction only overwrites allowlisted website paths; it does not delete unknown existing files. Review collisions with any server-managed files using those same paths before release.

Current ZIP: 3,769,660 bytes; SHA-256 `ba8397e377f7d720c21d6b3ad60f7dfcfd202d509051c8f43e1c2224a091d442`. Two builds matched. Production noindex assertions preserve intentional original legal-page SEO while rejecting staging-only directives. Never use the previous staging-only ZIP in production.

```powershell
Set-Location -LiteralPath 'C:\Users\User\Documents\Work\Web_Page_3DSpatium'
node migration/extract.mjs --check
node --test tests/migration.test.mjs
py -3.10 tests/gallery-browser.py
py -3.10 scripts/package-staging.py --target production
Get-FileHash -Algorithm SHA256 -LiteralPath '.\artifacts\3dspatium-production.zip'
```

Rebuild only after reviewing source changes; a changed checksum is a new release requiring retest. No server configuration is bundled. Existing production indexing/redirect/auth rules must be inspected rather than overwritten; if an existing rule blocks Sanity or adds noindex, stop and prepare a separately authorized server fix.

## Safest gated sequence

1. Review the local failure-handling changes and residual Studio advisories. Resolve or explicitly accept the CLI findings before Studio deployment; owner permission review is also required. No blanket approval is inferred from this preparation task.
2. After staging upload approval, rebuild the revised staging package with `py -3.10 scripts/package-staging.py --target staging`, back up staging and use its established File Manager procedure. Recheck the revised image-error/empty-result paths there. The prior staging ZIP is not the revised code. Keep the production-targeting Git deployment untouched. Re-sign off desktop/mobile appearance and unrelated content against production.
3. Follow the separate Studio guide. Login and deploy are interactive, separately approved actions: `pnpm.cmd exec sanity login`, then only after deployment confirmation `pnpm.cmd deploy`. Verify project, hostname, actual returned app ID and owner login. Do not upload Studio to cPanel. Native hosted authentication protects editing; do not share developer accounts/tokens.
4. After Sanity settings approval, add **`https://3dspatium.hr`** to project API → CORS origins with credentials **disabled**. Add `https://www.3dspatium.hr` only if it actually serves the page without redirecting to the canonical origin. Do not add wildcards. The canonical origin is currently blocked (403); this is a real activation blocker. The hosted Studio's exact origin needs authenticated credentials enabled separately. Refer to [Sanity CORS](https://www.sanity.io/docs/content-lake/cors).
5. Obtain explicit production upload approval and verify the existing production backup is current, complete, readable and stored privately. If the backup predates recent live changes, take a fresh approved snapshot first. Production root is `/home/dspatiumhr/public_html/`; staging root is a different path. Do not extract into the account home or follow an ambiguous `www` symlink. Confirm server-managed files and account disk space in File Manager.
6. Deploy only the reviewed production ZIP through the procedure below; run the immediate acceptance checks. Keep rollback available. No cPanel Git Deploy and no Sanity content mutation are needed to activate the frontend.

## Exact cPanel production procedure — only after explicit upload approval

1. In cPanel → **Domains**, read and confirm the production document root `/home/dspatiumhr/public_html/`. Do not change domain settings. In **Files → File Manager → Settings**, enable Show Hidden Files.
2. Open that exact production root and verify the existing production backup includes its old HTML/JS/CSS/local assets plus `.htaccess`, `.user.ini`, `php.ini`, `.well-known` and other existing dotfiles/configuration where present. Keep backup outside all public roots and download a copy. Record which archive layout it uses (site contents directly versus wrapper folder). Record the existing new-gallery-script presence/absence so rollback knows which files are release-only. Do not rely on backup filenames alone.
3. Record checksums or download unchanged server-managed configuration files for later comparison; do not upload those files from the repository. Preserve any existing PHP/auth/SSL/redirect/cache settings and `.well-known` contents. Inspect the release's 38-path manifest against existing files. Stop if a path is symlinked/shared unexpectedly.
4. Create/open a private holding directory such as `/home/dspatiumhr/production-release-review/`, outside both site roots. **Upload only `3dspatium-production.zip`**, not the staging archive, manifest, repository or Studio. Verify size and checksum by downloading the uploaded ZIP if the panel cannot hash it.
5. Select the production ZIP → **Extract**. Enter exactly `/home/dspatiumhr/public_html/` and verify the archive listing has 38 relative public paths with no server-managed files. This is the first production-writing operation and is authorized only by explicit release approval. Do not press Extract until the destination and archive are independently rechecked. Use an agreed low-traffic window; multi-file extraction is not atomic and can temporarily mix releases. See [cPanel File Manager](https://docs.cpanel.net/cpanel/files/file-manager/110/).
6. Check extraction errors and direct placement of the homepage and two new gallery scripts. Verify HTML contains the manifest's content-hashed JS/CSS URLs, config enabled, and the expected API project/dataset. Confirm server-managed file contents were not changed. Do not loosen permissions to 777 or change web-server rules to fix an unrelated error.
7. Open a private browser with DevTools Disable cache, hard-refresh production and run acceptance below. Scope any necessary cache action to these production release URLs; do not change a shared cache policy or hosting settings without separate approval. Keep the old backup and release ZIP private until signoff.

## Immediate post-release acceptance

- Homepage, legal pages, CSS and JS return 200 over HTTPS, expected MIME types and canonical production URLs; no unexpected redirect. Homepage must have no noindex meta/header, robots allows crawling and points to production sitemap. Original legal-page noindex policy remains intentional.
- DevTools Console: `document.querySelector('.portfolio-grid').dataset.source` is `sanity`; four cards and `image.galleryPhotographs` total 25. Inspect real anonymous published API response and Sanity CDN image URLs; four local cards alone are insufficient proof. No CORS, auth, network, console, mixed-content or image errors.
- Verify PAG/ZAGREB/OSIJEK/OSIJEK, 4/8/9/4 photos and 10/20/30/40 project order. Open all 25 photos; test next/previous/wrap, keyboard entry/Tab/Escape/focus return, touch close/navigation and page scroll restoration.
- Compare desktop/mobile typography, crops, layout, animations and navigation against approved revised staging. Include physical iPhone/Safari and Android. Test legal links, contact validation, social links and menus; obtain permission before a real Formspree submission.
- Simulate blocked API in **your browser only** and reload: require original static fallback, then remove blocking and reload to return to Sanity. Simulate `{"result":[]}` with a browser-local response override or use the automated suite: require an empty gallery. Do not unpublish real projects for a test. Remove overrides immediately afterward.
- Compare preserved `.htaccess`, `.user.ini`, `php.ini`, `.well-known` and other recorded server files with their baseline. Check effective response headers rather than assuming the package controls them.

## Rollback using the existing production backup

Use the verified pre-release production backup, not the staging package. Obtain rollback approval according to the agreed release process. Keep Sanity content intact.

1. Preserve failure diagnostics. Confirm the backup corresponds to `/home/dspatiumhr/public_html/` and inspect its archive layout. Do not guess extraction destinations from a wrapper folder.
2. Restore the old **public website files only** from the backup into `/home/dspatiumhr/public_html/`, including its old HTML, script/style versions and images. Server-managed configuration was not part of this release: leave current `.htaccess`, `.user.ini`, `php.ini`, `.well-known` and unrelated hosting files in place. Do not blindly extract a full hosting backup over files managed since it was taken. If such configuration truly needs restoration, handle it as a separate reviewed hosting rollback.
3. The old HTML no longer references new gallery scripts. They can remain inert; for exact cleanup, move only release-added files proven absent from backup into a private holding folder after checking their paths. Never delete the entire production root or recursively replace `slike/`.
4. Hard-refresh and verify the old site, gallery, indexing and navigation. Use the restored HTML's asset versions, and scope any cache action to affected URLs. No Studio undeploy, Sanity asset deletion, dataset import, or user removal is required.

An interim fallback-only rollback is changing **deployed production** `gallery-config.js` to `enabled: false` and bumping its script query version in deployed HTML, after approval. That restores the retained original gallery without reverting the rest of the release. This is a production edit and was not performed during preparation.

## Remaining release decisions

Production upload and Studio deployment are **not authorized yet**. Gates are: revised staging acceptance, production CORS, owner-role/hosted-login acceptance, documented CLI advisory disposition, verified production backup/layout/server-file inventory, physical-device signoff and final release approval. All artifact preparation is local; no remote setting or content has been changed by the agent.
