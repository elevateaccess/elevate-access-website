# Elevate Access Solutions website

Source of truth: [elevateaccess/elevate-access-website](https://github.com/elevateaccess/elevate-access-website).
Public website: https://www.elevateaccess.us (also reached through https://elevateaccess.us).
Hosting: Cloudflare Pages, project `elevate-access-website`.
Default GitHub branch: `main`.

Fernando confirmed the migration from ChatGPT Sites to GitHub and Cloudflare, including the domain routing change, on October 20, 2026. Maintain the website through this repository and Cloudflare Pages. The latest inspected commit had a successful Cloudflare Pages deployment check; that check alone does not verify custom-domain DNS, HTTPS, or redirects.

Keep website routing separate from Google Workspace DNS. DNS changes, subscription cancellation, purchases, and external test messages require their own authorization.

## Build and preview

Requires Python 3. No build dependencies or frontend framework.

```sh
python3 build.py
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000 to preview. The complete website is generated in `dist/`. Root-relative URLs require serving it through a web server at the hostname root.

The default build follows `config.json`: public indexing, https://www.elevateaccess.us as the canonical origin, and no draft label. Building generates files locally; it does not publish or change DNS. Local previews use the production canonical origin unless an HTTPS origin is explicitly supplied with `--origin`. Robots directives and draft labels do not restrict access.

## Maintain through GitHub

Retrieve the current repository source and inspect its current instructions before editing. Make changes in the source files, rebuild, review the diff, and run the checks relevant to the change. Use a branch and pull request for review when appropriate. Treat changes to `main` as production-bound and check Cloudflare's deployment result after publishing.

- English business content, biographies, services, and article metadata/bodies: `content/site.json`.
- Spanish business content and article metadata: `content/site.es.json`.
- Spanish article bodies: `content/articles/*.es.html`, referenced through each article's `body_file`.
- Bilingual interface copy and equivalent page routes: `content/locales.json`.
- Service area and delivery methods: `service_area` in both content files, shown on Home, Services, and Contact.
- Shared layouts, page metadata, and generation: `build.py`.
- Styling, responsive behavior, focus, and automatic light/dark themes: `web/styles.css`.
- Mobile menu behavior and language-link fragments: `web/site.js`.
- Local images and approved SVG brand assets: `assets/`; original asset sources and audit materials: `docs/audit/`.

The header and footer use the approved reversed `eas-*.svg` wordmarks, and `eas-mark.svg` is the scalable browser icon. Keep `logo.png` for metadata and compatibility fallback.
- Canonical origin and indexing defaults: `config.json`.

Rebuilding replaces generated `dist/` pages. Edit source first. Generated output is currently tracked in Git, so include the resulting `dist/` changes when changing website source. Review any generated documentation changes too.

The imported `.openai/hosting.json` is legacy ChatGPT Sites metadata, not the current Cloudflare deployment configuration. Do not use its project ID to publish this website through Sites. Older review, localization, DNS snapshot, and QA documents retain historical information; their Sites instructions, page counts, and DNS values may be outdated. Use this README for the current hosting workflow and inspect actual configuration before changing it.

## Bilingual content and articles

Both the AI agents article and the BART/Aira article are present in English and Spanish. English articles are in `content/site.json`; Spanish metadata is in `content/site.es.json`, with bodies in `content/articles/`. The AI article's source and image credit are recorded in `docs/article-assets.json`; retain image credits and license/source links in article bodies.

Only articles explicitly marked `"status": "published"` are generated. Use `"status": "draft"` in both editions for work that must be excluded from public output. Draft content committed to this public repository is still publicly readable in GitHub. Use an appropriate private review location for confidential material.

Example English article:

```json
{
  "status": "draft",
  "slug": "approved-human-readable-slug",
  "title": "Approved article title",
  "description": "Accurate page description",
  "author": "Confirmed author name",
  "date": "2026-10-20",
  "category": "Assistive technology",
  "image": "/assets/approved-image.jpg",
  "image_alt": "Accurate description of the image",
  "body_html": "<h2>Approved heading</h2><p>Approved content.</p>"
}
```

Provide a matching Spanish article with a `translation_key` equal to the English article's key (the English slug by default). Use reviewed HTML, begin body headings at h2, and supply accurate alternatives in each language. Spanish uses formal usted in direct instructions.

The build rejects unmatched published articles and stale translation review markers. Review and update the Spanish counterpart before refreshing `translation_source_sha256` or `translation_source_ui_sha256`. The exact signature calculation is documented in `docs/LOCALIZATION.md` and implemented in `build.py`; changing a marker alone does not establish translation accuracy.

The build generates article pages, listings, metadata, and sitemap entries. There is no visual CMS, scheduled publishing, RSS, search, or comments.

## Checks

For website source changes:

```sh
python3 build.py
node --check web/site.js
python3 -m py_compile build.py
cd qa
npm ci --no-audit --no-fund
node validate.cjs
node bilingual.cjs
node theme.cjs
```

QA packages are development-only. Existing reports in `docs/` describe the versions and pages tested at their recorded dates; they do not establish that later changes passed. Automated checks do not verify real-browser layout, actual keyboard traversal, VoiceOver, NVDA, or WCAG conformance. Review representative desktop/mobile pages and assistive-technology behavior for relevant changes.

Documentation-only changes need a diff and link/command review; they do not require rebuilding the website.

## Cloudflare deployment and domain verification

Cloudflare Pages is connected to this GitHub repository. The deployment build command for this source is `python3 build.py`, and the output directory is `dist`. Confirm the actual production branch and build settings in the Cloudflare dashboard when changing deployment configuration; these settings are not captured in a Cloudflare configuration file in this repository.

After an authorized publication:

1. Confirm the intended commit and its Cloudflare Pages deployment check succeeded.
2. Check both apex and `www` HTTPS, representative English/Spanish pages, article links, images, language switching, and the sitemap.
3. Verify canonical redirects, legacy redirects, and a true HTTP 404 for unknown paths on the live host.

`docs/redirects.csv` lists legacy routes and intended permanent destinations. The build currently creates HTML-refresh/canonical fallback pages; those do not establish HTTP 301/308 redirects. Verify or configure permanent redirects in Cloudflare as appropriate.

The website can also be served by another HTTPS static host with directory-index routing. Set the canonical origin and rebuild when moving to another domain. The deployed website needs no ChatGPT Sites SDK, runtime database, or platform connector.

## Contact behavior

The site displays the verified email address as a selectable email link and the phone number as a telephone link. There is no inquiry form or automated message submission. Visitors can activate the link in their configured email app or copy the address.

## History, backup, and rollback

GitHub records source history. Preserve content, images, build code, and deployment settings so another developer can maintain the website. Keep credentials, environment files, Python caches, and `node_modules` out of commits and portable exports.

For a website regression, review the last known-good commit and revert the relevant change or use Cloudflare's deployment rollback facilities. Verify the resulting deployment and live pages. A Cloudflare rollback and the GitHub branch may differ afterward; reconcile them before the next publication.

Domain rollback is a separate action requiring explicit authorization and fresh, verified DNS records. Historical snapshots in `docs/audit/` are not current configuration. Preserve Google Workspace and unrelated DNS records.
