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

Project Structure
Web_Page_3DSpatium/
├── .cpanel.yml       # cPanel deployment configuration
├── .vscode/          # editor settings
├── slike/            # images (favicon, portfolio photos, OG image)
├── index.html        # page markup, SEO tags, structured data
├── styles.css        # all styling
├── myscript.js       # nav toggle, scroll reveal, lightbox gallery, form handling
├── robots.txt
├── sitemap.xml
├── LICENSE            # MIT
└── README.md