# Production verification - 16 October 2026

## Completed fixes at a glance

| Fix | Result |
|---|---|
| Original gallery restored | 25 original WebP files recovered from Git; exact project image counts and sequence: 4 / 8 / 9 / 4 |
| Gallery labels corrected | PAG / ZAGREB / OSIJEK / OSIJEK above the requested building-purpose labels |
| Logo alignment corrected | Logo and name vertically centered with desktop links and the mobile menu toggle; verified on all three pages |
| Gallery keyboard access | Focusable thumbnails, Enter/Space opening, contained Tab navigation, Escape and focus return |
| Gallery timing and scroll locking | Rapid reopening stays open; resizing preserves the open gallery's page scroll lock |
| Mobile navigation | Keyboard focus stays inside the open menu and returns on dismissal; first-link focus waits for visibility |
| Menu breakpoint flash | Closed menu no longer slides across the screen when switching from desktop to mobile |
| Reveal-content fallback | Content remains visible if JavaScript fails to load or IntersectionObserver is unavailable; animations and reduced motion retained |
| Contact form reliability | Duplicate in-flight submissions blocked; submission URL comes from the form's configured action |
| cPanel deployment completeness | Both legal pages included in the existing staging copy tasks |
| Indexing and response headers | Repository noindex rule scoped to staging; nosniff added; actual hosting behavior still needs verification |
| Broken references | Legal navigation points to an existing section; social previews reference an existing image |
| HTML and resource loading | Invalid homepage markup corrected; unused external font requests removed without changing selected font families |

Current asset URLs: **styles.css?v=2.4** and **myscript.js?v=2.3** on all three pages. No commit, push, merge or deployment has been performed.

Verification: **121 browser assertions passed before the final logo/gallery corrections**. Follow-up browser checks verified logo alignment on all three pages at desktop/mobile widths, then all 25 restored gallery images, ordering, counters, wrapping and focus return. The user subsequently confirmed the appearance. The complete 121-assertion suite was not rerun after those final corrections; the affected components received the targeted checks described above.

Remaining staging checks: effective Apache/HTTPS headers, actual Formspree mail delivery, and physical iPhone/Android behavior. The reported spontaneous mobile refresh was not reproduced and is not claimed fixed.

## Requested gallery restoration

Restored the original 25 WebP images directly from Git revision `71aeaea`, with the original per-project lists and ordering: **4 / 8 / 9 / 4**. Location labels are **PAG / ZAGREB / OSIJEK / OSIJEK**; purpose labels are **Stambena zgrada / Poslovna zgrada / Obiteljska kuća / Obiteljska kuća**. Existing CSS, layout and gallery control code are unchanged by this restoration.

Verified every restored image against the original Git blob and decoded all 25 files. Browser testing confirmed all 25 images load in order, correct counters, next-image wrapping and keyboard focus return for all four projects. No commit, push or deployment.

The earlier verification record below describes the gallery before this explicitly requested restoration; its old 4/1/2/1 counts and unchanged-copy/markup statements apply to that earlier pass.

Second pass on the existing branch. No commit, push, merge or deployment. This current handoff supersedes the first-pass report.

## Verified fixes

| Area | Reproduced defect | Targeted correction | Browser verification |
|---|---|---|---|
| Gallery keyboard | Thumbnails unfocusable; focus returned to body; modal Tab order could escape | Add button role, tab stop and Enter/Space activation to existing images; match focus trap to DOM order; restore thumbnail focus; make fading modal inert | All four galleries: entry, forward/reverse Tab, Escape, focus return |
| Gallery lifecycle | Pending close timer can hide a newly reopened modal | Cancel obsolete open/close timers | Rapid close/reopen remains open; normal mouse/touch controls pass |
| Mobile menu | Focus escapes panel; initial focus can fail while links are hidden | Contain Tab/Shift+Tab; wait two animation frames before first-link focus; restore focus on dismissal | All three pages; first/last links, toggle, Escape and desktop resize |
| Breakpoint menu flash | Closed desktop links animate visibly across screen when switching to mobile | Suppress transitions only during breakpoint changes | Frame sampling: zero visible closed-menu frames at mobile width after correction |
| Gallery resize | Desktop resize handler clears body scroll lock even without an open menu | Close/unlock menu on resize only when it is open | Gallery scroll lock retained across desktop/mobile resize |
| Reveal failure | Blocking myscript.js leaves content invisible | Visible default; opt into existing animation only with a working observer | Blocked script, absent observer, normal animation and reduced motion |

Second-pass edits: `myscript.js`, the reveal rules in `styles.css`, shared asset URLs in all three HTML pages (`v=2.3`), and this report. First-pass changes remain: legal-page deployment tasks, staging-only indexing header, malformed homepage markup, broken fragment/social-image references, menu aria-controls, unused font requests and form submission guard/configured endpoint.

During the second pass, before the requested gallery restoration, no page copy, colors, font choices, gallery assets, ordering, crop rules, dimensions or transition durations changed. Gallery markup remained unchanged; JavaScript adds only the interaction semantics above. Keyboard focus now exposes the existing focus outline. Mouse/touch opening, image navigation, wrapping and closing were exercised.

## Executed verification

- Real headless Brave/Chromium driven by Playwright. Tooling is temporary at `%TEMP%\spatium-browser-tools`; no project dependency or browser download was added. The initial sandbox network denial was resolved through an approved temporary installation. No Apache executable or browser connector was available.
- 79 interaction assertions passed: all gallery image groups (4/1/2/1), ordered source paths, loaded images, keyboard wrapping/focus return, mouse navigation, close/reopen, menus on all pages and reveal failure/motion behavior. No page JavaScript exceptions in that suite.
- All three pages compared to the saved first-pass baseline at 320, 375, 768, 800, 801, 1024 and 1440px: text/non-image screenshot pixels and gallery image geometry matched. Some image captures had small JPEG rasterization differences; image pixels were excluded from the exact comparison with a one-pixel edge allowance. Image files and presentation rules are unchanged. This is not a claim of byte-identical full screenshots.
- Computed font families/sizes matched at all seven widths. Making local test faces available under the Fraunces and Inter FontFace family names also left text geometry unchanged at 375/1440px. Neither family is selected by the site's CSS. Cross-device system fallback differences can still exist independently of the removed requests; no fonts or typography rules were changed.
- Five emulated mobile page loads: no initial menu flash. Repeated scroll/menu exercise: no unsolicited main-frame navigation. Touch gallery open/next/close passed. A separate breakpoint flash was reproduced and fixed; the reported spontaneous phone refresh remains unreproduced.
- Real-browser form tests intercepted every Formspree request locally: success/reset, API rejection, offline failure and non-JSON server failure all preserved the expected reset/input-retention and button recovery behavior. No message was delivered.
- JavaScript syntax, diff whitespace, local asset/fragment paths, exact filename case, unique IDs, body-copy preservation, JSON-LD parsing and gallery source-markup preservation checked locally.

Temporary scripts/evidence: `%TEMP%\spatium-verification\regression.py`, `interactions.py`, `mobile_checks.py`, `form_fonts.py` and `results.json`. Run scripts from the repository root with Python. These are local verification artifacts, not deployment dependencies.

## .htaccess: verified logic, unverified server behavior

The second pass leaves `.htaccess` unchanged. Seven host-pattern cases passed a local regex test: staging, uppercase staging and staging with a port match; production, www production, another subdomain and a lookalike suffix do not. This tests matching logic in Python, not Apache's regex engine or request processing.

Apache documents both [SetEnvIfNoCase](https://httpd.apache.org/docs/2.4/mod/mod_setenvif.html) and [conditional Header directives](https://httpd.apache.org/docs/2.4/mod/mod_headers.html) for .htaccess with FileInfo overrides. Actual compatibility still requires mod_setenvif, mod_headers and suitable AllowOverride on this host. The current Header set uses the default successful-response header table; error/redirect responses are not guaranteed to carry it. Noindex is not access control. No actual Apache response, rewrite inheritance, CDN or production header was tested.

## Unverified assumptions and manual staging checks

1. Back up the target document root and existing .htaccess. The existing cPanel task still targets `/home/dspatiumhr/staging.3dspatium.hr/`; it does not deploy production. Deploy only after explicit authorization.
2. Verify successful responses for all three pages, legal links, all 25 gallery images, `styles.css?v=2.4` and `myscript.js?v=2.3`. Check the Apache error log for disallowed directives or module issues.
3. Check effective headers with `curl -I https://staging.3dspatium.hr/` and direct page URLs: staging must include `X-Robots-Tag: noindex, nofollow`; production homepage must not include noindex from another layer. Verify nosniff, HTTPS redirects/certificates and any parent/CDN configuration. Use cPanel directory privacy if staging must be private.
4. On physical iPhone/Safari and Android/Chrome, check keyboard/screen reader behavior, gallery presentation, menu orientation changes, slow refresh and longer browsing. Chromium emulation does not establish Safari behavior or rule out device-specific refreshes.
5. With authorization to send a test message, confirm Formspree accepts the staging/production origins and that mail arrives. Browser tests mocked the network endpoint.
6. Clear any configured cPanel/CDN cache and verify `styles.css?v=2.4` and `myscript.js?v=2.3` are fetched. Before production release, repeat the same checks against the actual production document root, which remains unconfirmed.

No P0 or P1 defect remains confirmed and unresolved within this verification scope. No reproducible phone refresh was found. Production-specific headers and delivery remain unverified dependencies. Ready for staging acceptance; production release remains conditional on the checks above. Cross-engine/physical-device behavior and field performance are not certified.
