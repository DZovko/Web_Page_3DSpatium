3D Spatium — Website

Marketing website for 3D Spatium, a photorealistic 3D visualization studio based in Osijek, Croatia. The site presents the studio's services, portfolio, and a contact form for new project inquiries.

🔗 Live site: 3dspatium.hr

About

3D Spatium creates photorealistic architectural renders, interior/exterior visualizations, and virtual walkthroughs for residential and commercial spaces. This repository contains the source code for their one-page marketing site.

Features
Responsive one-page layout — hero, services ("Što radimo"), portfolio, and contact sections
Mobile navigation — hamburger menu with slide-out links and backdrop overlay
Scroll-reveal animations on section content
Portfolio gallery with lightbox modal — each project card can hold multiple images (via data-extra attributes) with prev/next navigation
Contact form wired up to Formspree for email delivery, with inline submit status
SEO-ready — meta description, canonical URL, geo tags, Open Graph & Twitter Card tags, and JSON-LD structured data (LocalBusiness, WebSite, FAQPage)
sitemap.xml and robots.txt included for search engine indexing

Tech Stack
HTML5 / CSS3 / vanilla JavaScript — no frameworks, no build tools
Google Fonts (Open Sans)
Formspree for form handling
Hosted via cPanel (see .cpanel.yml)


## Gallery CMS

The portfolio reads published gallery projects from Sanity project `abufysa8`, dataset `production`, using `gallery-config.js` and `gallery-sanity.js`. The original HTML gallery and all 25 local photographs remain available as a static fallback. Public browser code contains no write token; Sanity Studio remains a separate application in `studio-3dspatium`.

Run `node --test tests/migration.test.mjs` for migration safeguards and `py -3.10 tests/gallery-browser.py` for browser regression checks (see the integration guide for test prerequisites). Migration tooling is offline by default and must not be run with `--write` without explicit content approval.

See [SANITY-INTEGRATION.md](SANITY-INTEGRATION.md) for architecture, [CMS-PRODUCTION-RELEASE.md](CMS-PRODUCTION-RELEASE.md) for release and rollback procedures, and [FINAL-STAGING-RELEASE.md](FINAL-STAGING-RELEASE.md) for the final staging package. Release documents also retain historical verification and approval checkpoints.

Generated release archives are excluded from Git and can be rebuilt with `py -3.10 scripts/package-staging.py --target staging` or `--target production`. Do not use cPanel Git Deploy for this release: the unchanged `.cpanel.yml` targets production and does not copy the new gallery scripts. A Git push does not authorize a hosting deployment.

## License

© 2026 3D Spatium. All rights reserved.
This repository contains the proprietary source code for the 3D Spatium website. 
No part of this code may be copied, reused, or redistributed without permission.
