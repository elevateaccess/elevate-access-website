# Elevate Access Solutions website

Fernando authorized public publication and the domain cutover on October 19, 2026. Keep website routing separate from Google Workspace DNS. Do not cancel Squarespace, purchase integrations, or send external test messages without separate authorization.

## Build

Requires Python 3. No build dependencies or frontend framework.

```sh
python3 build.py
```

The complete website is generated in `dist/`. The default build now follows `config.json`: public indexing with https://www.elevateaccess.us as canonical origin and no draft label. Serve `dist/` through a web server to test it; opening HTML files directly does not resolve root-relative URLs.

The Site's private access gate is the actual audience restriction. Robots directives are not access control.

## Maintain by conversation

Identify this Site by https://elevateaccess.us or its project ID in `.openai/hosting.json`. Retrieve the existing Site and source before editing, retain its identity and current audience, then follow the Sites source and publication workflow. This Site is public.

- English business content, biographies, services, and article: `content/site.json`.
- Spanish business content and article metadata: `content/site.es.json`; full Spanish article: `content/articles/agentes-ia-independencia-digital.es.html`.
- Bilingual interface copy and equivalent page routes: `content/locales.json`.
- Service area and delivery methods: `service_area` in both content files; shown on Home, Services, and Contact.
- Shared layouts and page metadata: `build.py`.
- Styling, typography, responsive behavior, and focus: `web/styles.css`.
- Automatic light and dark themes: semantic color variables in `web/styles.css`; `prefers-color-scheme` follows browser/OS preference without JavaScript or stored preferences. Dark colors apply to screens; print retains the light palette. Keep informative images in their original colors.
- Mobile menu labels, focus handling, and shared language-link fragments: `web/site.js`.
- Local images: `assets/`; original public-source copies and URLs are in `docs/audit/`.
- Site identity and static hosting configuration: `.openai/hosting.json`.
- Canonical origin and indexing defaults: `config.json`.

Do not edit generated `dist/` pages as the primary source; rebuilding replaces them.

## Articles

`content/site.json` contains the approved AI agents article imported from the corrected HTML preview, not the Word draft. Its source and image credit are recorded in `docs/article-assets.json`. Only an item explicitly marked `"status": "published"` is generated. To prepare content without publishing it, use `"status": "draft"`; it will be excluded from the generated output. Add a review-only article route when explicitly requested rather than using the public marker as a drafting shortcut.

Published article schema:

```json
{
  "status": "published",
  "slug": "approved-human-readable-slug",
  "title": "Approved article title",
  "description": "Accurate page description",
  "author": "Confirmed author name",
  "date": "2026-10-19",
  "category": "Assistive technology",
  "body_html": "<h2>Approved heading</h2><p>Approved content.</p>"
}
```

Use reviewed, trusted HTML only. Begin article body sections at h2, supply image alternatives, and add source links when needed. The template builds the article page, index listing, canonical URL, social metadata, and sitemap entry. It does not supply an editorial calendar, scheduled publication, RSS, search, comments, or a visual CMS.

## Contact behavior

At Fernando's request, the site displays the verified email address as a selectable email link and the phone number as a telephone link. There is no inquiry form, email-preparation workflow, or “Request a consultation” prompt. The email link opens a configured email app only when the visitor activates it; it never sends automatically. Visitors can also copy the address into their preferred email service.

## Checks

```sh
node --check web/site.js
python3 -m py_compile build.py
cd qa
npm ci --no-audit --no-fund
node validate.cjs
node bilingual.cjs
node theme.cjs
```

QA packages are development-only and never deployed. `docs/automated-qa.json` records the tested result and limitations. Automated DOM tests do not verify real-browser layout, actual keyboard traversal, VoiceOver, NVDA, mail-app behavior, delivery, or WCAG conformance. Repeat the manual acceptance checks in the project review before launch.

## Host elsewhere

Deploy the contents of `dist/` to any HTTPS static host with directory-index routing. Set the origin for that host and rebuild. No Sites JavaScript SDK, external fonts, runtime database, or platform connector is needed by the website itself. Root-relative links require serving at the hostname root.

For an approved production build only:

```sh
python3 build.py --origin https://www.elevateaccess.us --public
```

This command generates files only. It does not publish, connect the domain, or change DNS. Do not run it as an implied launch authorization.

Aliases have immediate HTML refresh and canonical fallback pages. `docs/redirects.csv` lists the required permanent redirects. Real server-side 301/308 handling and slash normalization must be verified on the chosen host before migration; this static implementation does not claim to provide verified HTTP redirects.

## Backup and rollback

Back up source, content, assets, `dist/`, and documentation without `.git`, credentials, environment files, Python caches, or `node_modules`. Sites' access controls, account routing, version history, and domain attachment are platform features, not portable site files. To host a separate copy, remove the original project ID and register it as a distinct project; never use that ID to overwrite the existing Site accidentally.

For a Site-only regression, redeploy a known-good saved Site version. For a domain cutover regression, restore the captured website DNS records while leaving all email and nameserver records intact; keep Squarespace active throughout the rollback window. Only act with explicit cutover or rollback authority.
