# Elevate Access Solutions website

Source of truth: [elevateaccess/elevate-access-website](https://github.com/elevateaccess/elevate-access-website).
Public website: https://www.elevateaccess.us (also reached through https://elevateaccess.us).
Hosting: Cloudflare Pages, project `elevate-access-website`.
Default GitHub branch: `main`.

Fernando confirmed the migration from ChatGPT Sites to GitHub and Cloudflare, including the domain routing change, on October 20, 2026. Maintain the website through this repository and Cloudflare Pages. The latest inspected commit had a successful Cloudflare Pages deployment check; that check alone does not verify custom-domain DNS, HTTPS, or redirects.

Keep website routing separate from Google Workspace DNS. DNS changes, subscription cancellation, purchases, and external test messages require their own authorization.

## Build and preview

Requires Python 3 and Node.js 22 or later. Pagefind 1.5.2 is pinned in `package-lock.json`; install it with `npm ci`. No frontend framework is required.

```sh
npm ci --no-audit --no-fund
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

The header uses the approved reversed wordmark on Foundation Navy. The footer uses `eas-footer-transparent.svg`, a transparent-canvas reversed variant on Deep Navy; the previous baked-background SVG remains in the assets for provenance. `eas-mark.svg` is the scalable browser icon. Keep `logo.png` for metadata and compatibility fallback.
- Canonical origin and indexing defaults: `config.json`.

## Brand implementation

The Brand Standards Manual and Corporate Design System v1.4 are the design references. Foundation Navy `#0D1B2A` anchors the header, hero, and light-mode primary buttons. Deep Navy `#08131F` is reserved for the footer and terminal utility regions. Access Teal `#0E6B6F` serves light-surface links and the focus cue; Light Action Blue `#A5D8F5` serves links and primary actions on navy and dark reading surfaces. The site follows the browser or OS dark preference for reading surfaces (`#15191E` with light text), while the navy header/hero and deeper footer stay fixed. Its layout uses a 74 rem maximum width, responsive gutters, and content-led columns that collapse as space narrows. Headings use locally served Montserrat WOFF2 under the included SIL Open Font License; body text and controls use Arial at 17 px/1.65 line height. The homepage hero uses a concise bilingual headline and a 3:2 image crop on two-column layouts; mobile keeps the image's natural ratio. Primary buttons have at least 48 px height and an 8 px radius. The editable guides and design tokens are maintained in the Elevate Access brand kit in Google Drive.

The header's reversed SVG has a Foundation Navy canvas that blends into the header. The footer's new SVG has no background rectangle so the surrounding Deep Navy surface is uninterrupted. Both logo images remain decorative within a home link that carries the clean accessible name; do not substitute technical SVG metadata for alternative text. Keep the input-aware focus behavior in `web/site.js` when changing the focus ring, so VoiceOver touch focus does not leave a persistent visual outline.

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

The build generates article pages, listings, metadata, sitemap entries, and fresh search indexes. There is no visual CMS, scheduled publishing, RSS, or comments.

## Search and content updates

Search is available at `/search/` and `/es/buscar/`, linked from the shared navigation. Pagefind searches the current edition's published main content, titles, and descriptions. English and Spanish use separate indexes; switching languages preserves the query without translating it. Search runs in the visitor's browser using files hosted with this site. It does not search the full contents of outside websites linked from Resources.

Keep editing the normal source files and reviewing both language editions. No manual search submissions or article registry is needed. `python3 build.py` removes old generated output, builds pages, runs `scripts/build-search.mjs`, then runs `scripts/verify-search.mjs`. A dependency, indexing, coverage, language, or integrity failure exits with an error, preventing a successful Cloudflare build. Publish only after the required checks pass.

The generator indexes canonical published pages from the generated inventory. Search pages, aliases, 404s, drafts, headers, navigation, footers, and repeated contact CTAs are excluded. The search UI script loads only on the two search pages. Search runtime files in `dist/pagefind/` are generated and ignored by Git; `dist/search-manifest.json` records the page and runtime hashes and is tracked with other generated output. Never edit the index, manifest, or generated pages by hand.

Browser QA uses pinned Playwright 1.56.1 on the supported `ubuntu-24.04` GitHub runner. Keep the browser dependency and runner compatible when upgrading either.

The required **Website quality** job installs the pinned dependencies, rebuilds pages and search, checks generated-file freshness, and runs `qa/search.cjs` alongside the existing checks. CI also waits for the Cloudflare deployment of the exact commit and verifies the deployed search pages, manifest, index coverage, and live queries. After a merge, the main-branch run repeats those checks on the production custom domain. Search tests verify every published page and its current metadata in each language, real browser queries, result links, focus, status feedback, responsive layouts, rendered accessibility/contrast, error recovery, and browsing without JavaScript. Disposable rebuilds test edits, URL changes, draft exclusion, unpublishing, and indexing failures. Deliberately missing, corrupt, incomplete, or stale search artifacts must fail validation. Keep these steps in the required job; do not mark them optional, skip them for content-only changes, or allow failures.

Branch protection requires **Website quality** and **Cloudflare Pages** for normal merges into `main`. Keep those requirements intact and verify them when changing the workflow. Administrative bypass permissions are a separate repository setting and must not be used to publish a failed change. Automated browser checks do not establish VoiceOver/NVDA usability or full WCAG conformance.

## Checks

For website source changes:

```sh
npm ci --no-audit --no-fund
python3 build.py
node --check web/site.js
node --check web/search.js
python3 -m py_compile build.py
cd qa
npm ci --no-audit --no-fund
node validate.cjs
node bilingual.cjs
node theme.cjs
npx playwright install --with-deps --only-shell chromium
node search.cjs
```

QA packages are development-only; Pagefind is a build dependency. Existing reports in `docs/` describe the versions and pages tested at their recorded dates; they do not establish that later changes passed. Search checks exercise Chromium rendering and keyboard interactions; the older general checks use static markup or an emulated DOM. Neither establishes VoiceOver/NVDA usability or WCAG conformance. Review representative desktop/mobile pages and assistive-technology behavior for relevant changes.

Documentation-only changes need a diff and link/command review; they do not require rebuilding the website.

## Cloudflare deployment and domain verification

Cloudflare Pages is connected to this GitHub repository. The deployment build command remains `python3 build.py`, and the output directory is `dist`. Its dependency installation must install the root `package-lock.json` before building; search indexing and integrity verification run inside the Python build command. Confirm the actual production branch and build settings in the Cloudflare dashboard when changing deployment configuration; these settings are not captured in a Cloudflare configuration file in this repository.

After an authorized publication:

1. Confirm the intended commit and its Cloudflare Pages deployment check succeeded.
2. Check both apex and `www` HTTPS, representative English/Spanish pages, article links, images, language switching, the sitemap, and a representative query on both search pages.
3. Verify canonical redirects, legacy redirects, and a true HTTP 404 for unknown paths on the live host.

`docs/redirects.csv` lists legacy routes and intended permanent destinations. The build currently creates HTML-refresh/canonical fallback pages; those do not establish HTTP 301/308 redirects. Verify or configure permanent redirects in Cloudflare as appropriate.

The website can also be served by another HTTPS static host with directory-index routing. Set the canonical origin and rebuild when moving to another domain. The deployed website needs no ChatGPT Sites SDK, runtime database, or platform connector.

## Contact behavior

The site displays the verified email address as a selectable email link and the phone number as a telephone link. There is no inquiry form or automated message submission. Visitors can activate the link in their configured email app or copy the address.

## History, backup, and rollback

GitHub records source history. Preserve content, images, build code, and deployment settings so another developer can maintain the website. Keep credentials, environment files, Python caches, and `node_modules` out of commits and portable exports.

For a website regression, review the last known-good commit and revert the relevant change or use Cloudflare's deployment rollback facilities. Verify the resulting deployment and live pages. A Cloudflare rollback and the GitHub branch may differ afterward; reconcile them before the next publication.

Domain rollback is a separate action requiring explicit authorization and fresh, verified DNS records. Historical snapshots in `docs/audit/` are not current configuration. Preserve Google Workspace and unrelated DNS records.
