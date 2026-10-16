# Gallery integration — local review, 16 October 2026

Implementation is local only. No Sanity content writes, publishing, CORS changes, deployments, or hosting changes have been performed by the agent. `.cpanel.yml` is unchanged. Following the user's successful migration, publication, and localhost CORS update, the integration is **enabled locally** in `gallery-config.js`; this config has not been deployed. Live desktop/mobile browser tests now load all four projects and 25 photographs directly from Sanity and pass. Ready for approved staging deployment and acceptance checks. See `INTEGRATION-TEST-RESULTS.md` for current results. The rollout steps below remain gated on approval.

## Files and behavior

- `gallery-config.js`: public project/dataset/API version, enable switch, eight-second timeout. Never add a token here.
- `gallery-sanity.js`: credential-free fetch using the direct Content Lake API and explicit `published` perspective. GROQ sorts projects by `displayOrder`, then `_id` to break ties; the photo array retains its authored order. A page refresh fetches the latest published set; already-open pages do not live-update.
- `myscript.js`: existing lightbox uses delegated thumbnail events, supports individual photo alt/caption values, and observes added cards with the existing reveal observer. Menu, form, lightbox timing, focus trap, scroll locking, navigation, and CSS remain in place.
- `index.html`: original gallery HTML is retained verbatim. Only script includes changed. No CSS or original image files changed.
- `migration/gallery-manifest.json`: reviewed source snapshot with titles, locations, order, original alt text, file sizes, and SHA-1 hashes. Four projects, 25 photo entries in 4/8/9/4 order. `slike/projekt1/5.webp` is excluded and stays on disk.
- `migration/extract.mjs`: local snapshot generator; `--check` detects source changes. Do not regenerate the reviewed manifest casually.
- `migration/gallery.mjs`: offline validation by default; explicit read-only inspect/verify modes; guarded draft-only import mode. Node 22+; no dependencies added.
- Sibling `studio-3dspatium`: gallery schema, gallery-only Studio structure, extracted `schema.json`, generated `sanity.types.ts`. Vision is removed from the visible Studio tools; its existing package dependency is retained. React remains confined to Studio.

The schema uses Croatian labels and descriptions. Project display order is an integer, with smaller numbers first. Photographs use Sanity's native draggable array; the first photo is the cover. Photo alt text and an uploaded asset are required; captions are optional. Category preserves the existing building type as optional metadata without adding another visible label. Native drafts, publish, and unpublish actions remain available.

The existing gallery remains visible while loading. HTTP/API errors, timeout, invalid JSON, or malformed content retain the complete static gallery; no partial replacement occurs. A successful `[]` clears all cards. If the visitor has focused a card or opened its lightbox before the response arrives, that page keeps its static gallery to avoid detaching the active focus target. Refresh after closing to fetch again.

The API is explicitly published-only, with additional draft/version ID exclusions. Sanity documents the [published perspective](https://www.sanity.io/docs/content-lake/perspectives). The local fallback is a historical snapshot of the original projects: those originals can still appear during an outage even if later unpublished in Sanity. If an original must be removed from all public surfaces, also remove it from the reviewed local fallback in a separate approved update. Unpublishing does not revoke previously public image URLs.

## Migration safety and mapping

`pf-body h3` → `title`; `pf-tag` → `location`; existing building type → `category`; card position → `displayOrder` 10/20/30/40. Thumbnail `src` followed by `data-extra` → ordered image array. Existing project alt is copied to each image because the source contains no per-photo alt/caption metadata. The owner can improve those descriptions later. No invented captions or placeholders are imported. Existing anchors, SEO, non-gallery sections, and local URLs stay intact; no redirects are needed.

Stable import IDs are `gallery-import-projekt1` through `gallery-import-projekt4`; imports create their `drafts.` counterparts only. New projects created in Studio use normal generated IDs. `migrationSource` stores the source identity. Before any uploads, the importer inspects all four source identities, published IDs, draft IDs, and release-version IDs. Any existing match is skipped in full. It checks again after asset uploads and uses `createIfNotExists`, never patch, replace, delete, or publish. SHA-1 asset lookups reuse actual uploaded bytes; repeated imports do not intentionally upload duplicate assets. The [Assets API](https://www.sanity.io/docs/http-reference/assets) exposes this hash.

Reserved-ID branches are checked across all document types with the raw perspective, including published IDs, drafts, and `versions.*.<reserved-id>` release versions. This preflight also runs before published verification. A foreign document type blocks the entire import before any uploads, returns conflict IDs/types in the report, and causes a nonzero CLI exit. A second check after asset handling blocks document creation if a foreign ID appeared in the meantime. A read preflight cannot provide a transaction lock against concurrent edits; run only one import and avoid concurrent owner operations during initial import.

There is deliberately **no overwrite flag**. Owner edits, moved photos, unpublished drafts, and even incomplete existing gallery documents are skipped. Verification reports differences instead of repairing them. A reviewed repair needs a separate implementation and explicit approval. If owner-created content was manually recreated with a different ID and without `migrationSource`, it cannot be recognized reliably: inspect Studio before import. A failed run can leave uploaded but unreferenced assets; reruns reuse assets. No automatic cleanup is performed.

Both repositories ignore `.env` and `.env.*`, including nested local environment files. `.env.example` and `.env.*.example` remain versionable; templates must contain placeholders only. No credential environment files were already tracked when this safeguard was checked. Ignore rules prevent accidental additions, not deliberate `git add -f`; continue using terminal-only tokens for migration.

## Local checks

From `Web_Page_3DSpatium`:

```powershell
node migration/extract.mjs --check
node migration/gallery.mjs
node --test tests/migration.test.mjs
node --check myscript.js
node --check gallery-config.js
node --check gallery-sanity.js
py -3.10 tests/gallery-browser.py
git diff --check
```

The browser script requires Python Playwright and Pillow, plus Chromium. It reuses the previously installed temporary Python 3.10 verification packages when present; otherwise install those test tools into your chosen Python environment. Set `CHROMIUM_PATH` if Brave is not installed at the script's default Windows path. Test tooling is not a website runtime dependency. All external browser requests are intercepted, including simulated Sanity assets; no content writes or real form messages occur. Baseline comes from Git HEAD; update that baseline deliberately after committing this integration. Screenshots go to `%TEMP%/spatium-sanity-checks`.

From `studio-3dspatium`:

```powershell
pnpm.cmd exec eslint sanity.config.ts schemaTypes
pnpm.cmd exec tsc --noEmit --incremental false
pnpm.cmd exec sanity schema extract --path schema.json
pnpm.cmd exec sanity typegen generate
pnpm.cmd build
```

Local results: all eight migration tests and 191 browser assertions passed; Studio lint, type checks, extraction, TypeGen and build passed. Browser coverage includes 25 photo paths and counters in each of static/CMS modes, wrapping, keyboard entry/trap/return, touch navigation, mobile menu, empty data, network/HTTP/JSON/timeout failures, unsafe URL rejection, text injection, per-photo metadata, and mocked publish/unpublish result changes. Desktop/mobile full-page checks compare text/layout with image pixels masked and allow at most ten pixels with channel differences greater than two; image geometry is compared separately. Actual local photo bytes are used for mocked CMS image responses. This does not certify identical CDN rasterization or real Safari behavior.

## Exact steps before any migration writes

1. Review both projects' changes, the schema, manifest, importer, and tests. Confirm target `abufysa8` / `production`, stable import IDs, draft-only behavior, and the 4/8/9/4 source inventory.
2. Run the offline commands above. Keep `gallery-config.js` disabled. Inspect existing Studio content for source duplicates or reserved import-ID collisions.
3. In Sanity Manage, inspect dataset visibility. This token-free browser approach requires a public dataset; do not make a private dataset public without reviewing its contents and approving that change. Never solve a private-dataset response by adding a browser token.
4. Back up existing Sanity content using the project's approved export process and preserve both Git revisions/local assets. Run the local Studio with `pnpm.cmd dev`; inspect the gallery editing form before uploading anything.
5. For read-only inspection, create a temporary token with the least available read permissions for this project. For a later approved import, use a separate temporary token permitting asset upload and gallery-document creation. Do not paste either token into chat, command arguments, source files, or public hosting. Use the terminal's masked prompt:

```powershell
$gallerySecret = Read-Host 'Sanity token' -AsSecureString
$env:SANITY_AUTH_TOKEN = [System.Net.NetworkCredential]::new('', $gallerySecret).Password
try {
  node migration/gallery.mjs --inspect
} finally {
  Remove-Item Env:\SANITY_AUTH_TOKEN -ErrorAction SilentlyContinue
  $gallerySecret.Dispose()
}
```

6. Review the inspection report. Existing matches must be skipped, not overwritten. Missing entries are expected for an empty dataset. Request explicit approval for the import **before running the next section**. No writes were run during implementation.

## After explicit migration approval

In the same secure-token pattern, using the temporary write token, run from the website folder:

```powershell
node migration/gallery.mjs --write --confirm=abufysa8/production
node migration/gallery.mjs --verify
```

Save the reports outside public hosting. Verification exits nonzero for missing or changed source content and compares every photo position, alt, optional caption, and asset hash. Review all four drafts and all 25 original photographs in Studio; do not publish until approved. A rerun of `--write` skips existing projects entirely, even if owner edited. Remove the token from the environment and revoke the temporary write token when finished.

Publishing is a separate authorized action. Once the original drafts are approved and published, use the read token to run:

```powershell
node migration/gallery.mjs --verify-published
```

The published verification must pass before enabling the website integration. After legitimate owner edits, this source-parity command will report differences by design; it is an initial migration check, not a content-reset operation.

## Studio hosting, origins, and owner access — future authorized steps

No CORS or project access changes have been made. Follow Sanity's [CORS guidance](https://www.sanity.io/docs/content-lake/cors). Add only origins actually used, with no paths, wildcards, or trailing slash:

| Origin | Credentials | When needed |
|---|---|---|
| `http://localhost:3333` | Yes | Authenticated local Studio |
| Chosen exact `https://….sanity.studio` origin | Yes | Hosted Studio login |
| `http://localhost:8765` | No | Public website local testing at this port |
| `https://staging.3dspatium.hr` | No | Approved staging test |
| `https://3dspatium.hr` | No | Approved production activation |
| `https://www.3dspatium.hr` | No | Only if this origin actually serves the website rather than redirecting |

Choose one local website hostname/port and allow that exact origin; do not add `127.0.0.1` too unless you actually use it. Mock browser checks use a random port but do not need real CORS access. CORS is not authentication. Leave public website credentials disabled; Studio needs authenticated access.

After hosted-Studio deployment approval, run `pnpm.cmd deploy` in the Studio project, select a unique hostname, record the resulting Studio URL/app ID, and review the authenticated Studio origin. The existing CLI configuration enables automatic Studio updates; the local build warns that no app ID is configured. Review that existing release policy before hosting. Do not use `deploy-graphql`; this website uses GROQ over HTTP. See [Sanity Studio hosting](https://www.sanity.io/docs/studio/deployment).

Invite the owner through project member management using the least role available on the current plan that permits editing and publishing gallery content. Verify publish/unpublish permissions in their account; do not share a developer token or grant administrator access just for editing. The Studio exposes only gallery documents, but UI structure is not a security boundary. If future unrelated document types are added to the dataset, review role restrictions separately.

## Staging, production, and rollback — no automatic deployment

1. Confirm the staging document root in cPanel. The current `.cpanel.yml` points to **production** `/home/dspatiumhr/public_html/`; do not use its Deploy HEAD button for staging. It remains unchanged.
2. After content verification and staging authorization, upload only the reviewed website release files to that confirmed staging root, including both new gallery JS files, updated `index.html` and `myscript.js`, and the existing local assets. Keep Studio, migration scripts, manifests, tests, exports, and credentials outside public hosting. Enable the config in the staging copy only. Serve local tests with `py -3.10 -m http.server 8765` and visit `http://localhost:8765` if testing locally.
3. In staging, verify actual anonymous API access and CORS, all original images/order, appearance at desktop/mobile widths, keyboard and touch controls, and fallback with the API blocked. Publish an approved test project, edit it, reorder projects/photos, unpublish it, and refresh each time. Draft-only content must stay absent; successful empty data must clear all cards. Since staging uses the production dataset, test publishing also changes that dataset; perform this before public activation and only with approval. Do not unpublish original live content merely to test emptiness after activation; use a local mock instead.
4. Obtain release approval, back up the confirmed production root, and upload the same verified release through cPanel File Manager/SFTP or another explicitly approved workflow. Include `gallery-config.js` and `gallery-sanity.js`; the unchanged Git deployment tasks do **not** copy them. Future Git deployment automation needs a separately reviewed `.cpanel.yml` update. Check MIME types, cache versions, public API requests, and all pages after deployment. No hosting rules need changing for the integration.
5. For rollback, set `enabled: false` in the deployed config and bump its script query version to bypass cache. The original four-card/25-photo HTML and local assets immediately remain the gallery source. For a full code rollback, restore the reviewed pre-integration `index.html` and `myscript.js`; no Sanity deletion is needed. Missing gallery scripts also leave the static HTML usable, but should not be the deployment strategy.

Remaining acceptance checks: remote content/visibility/permissions, real asset uploads and publish lifecycle, exact staging document root, CORS, hosted Studio login, cPanel/CDN behavior, physical iOS/Android and Safari. Local mocked tests cannot establish these.
