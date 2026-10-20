# English and Spanish maintenance

The public website has eight pages per language, including the first article. English URLs remain unchanged. Spanish pages live under `/es/`, with readable Spanish routes. Both editions use the same templates, images, CSS, and JavaScript. The build produces ordinary static files; there is no translation widget, external translation service, database, or runtime language dependency.

## Content and terminology

- `content/site.json`: approved English business content and original corrected article.
- `content/site.es.json`: Spanish biographies, services, audiences, about text, and article metadata.
- `content/articles/agentes-ia-independencia-digital.es.html`: full Spanish article, including all three tables, image description/credit, and sources.
- `content/locales.json`: all shared interface text, language metadata, and paired section routes.
- `build.py`: shared layout, bilingual page pairing, SEO, and generation.

Spanish uses a professional Latin American register with formal usted in direct instructions. Terminology includes tecnología de asistencia, lectores de pantalla, líneas braille, baja visión, and interpretación visual. Organization/product names and the business identity remain unchanged. Juanita's translated certification statement retains RESNA, ATP, and since 2023; experience figures remain those of the approved English biographies. No service or credential was added.

The Spanish article translates the approved corrected HTML article, not the outdated Word file. It retains the original publication date, author, numbers, product descriptions, editorial qualifications, every external source URL, and all image-license links. Bibliography display titles are translated into Spanish for readers; their destinations remain the original sources, which may be in English. It does not represent a new fact-check of the article's historical product information.

## Requests through ChatGPT

Examples:

- “Update this service description in English and Spanish, preserving the meaning and contact details.”
- “Prepare this article in both languages as drafts. Do not publish yet.”
- “Replace Juanita's portrait in both languages and write accurate alternative text for each.”
- “Review and publish the approved bilingual changes, then update the full Drive backup.”

Retrieve the current source first, edit both editions, run the checks below, then publish the existing Site with its current audience. Keep the existing project ID. Never publish one locale's edits without reviewing the counterpart. Do not update the old Word article as the source for a website edit.

## Publication safeguards

Only articles with `status: published` are generated. Each published translation has a stable `translation_key` matching the English article's key (English defaults to its slug), while its own slug may be translated. The build refuses unmatched published article sets. Prepare both versions with `status: draft` until approved.

The Spanish content records `translation_source_sha256`; its locale records `translation_source_ui_sha256`. These identify the English public content and interface reviewed for that translation. The build refuses a stale marker after English content changes. These markers indicate a review checkpoint, not automatic proof of translation accuracy. Update the Spanish text and review it before refreshing the markers. Draft English articles are excluded from the public-content signature.

Calculate the semantic SHA-256 as UTF-8 JSON with `ensure_ascii=False`, `sort_keys=True`, and `separators=(',', ':')`. For business content, omit English `source_note` and include only published articles. For interface text, hash `locales.en.ui`. This is implemented in `build.py` and tested by the bilingual QA script.

## Language switching and accessibility

The header has native English and Español links outside the collapsible mobile navigation. They lead to the equivalent page and work without JavaScript. Each link has its own `lang` and `hreflang`, and the active language uses `aria-current`. No flags, automatic redirects, geolocation, cookies, or browser-language guessing are used.

Pages identify their language with `lang="en-US"` or `lang="es"`. The translated interface includes skip links, navigation landmarks, mobile menu states, breadcrumbs, table-region names, error pages, contact guidance, image alternatives, and dates. The English and Español names in accessibility instructions also carry their own language markers. Brand names and technical proper names are retained.

Stable service and founder section IDs are shared between languages. JavaScript preserves a valid current section fragment when switching; native links without JavaScript open the equivalent page. The mobile menu's labels come from the current page's translated data attributes. Escape closes the menu and returns focus to its button. The CSS and JS breakpoint is 80rem, allowing room for the translated navigation and visible language links.

## Search and portability

Every canonical page has a self-referencing canonical, reciprocal en/es language alternatives, and x-default pointing to its English equivalent. The sitemap includes all 16 URLs and the same language relationships. Social metadata and WebPage/Article language fields are localized; the article schema links the two translations. Spanish and English can be indexed separately. Existing English aliases are preserved.

Serve `dist/` at the domain root on an HTTPS static host with directory-index routing. This structure remains portable to GitHub and Cloudflare. The host selects its global 404 page; `/es/404.html` is provided as a Spanish error document, but route-specific 404 status behavior has not been verified on Sites. Source files do not change registrar DNS, Google Workspace, or subscriptions.

## Verification

Run `python3 build.py`, `node --check web/site.js`, `python3 -m py_compile build.py`, `node qa/validate.cjs`, `node qa/bilingual.cjs`, and `node qa/theme.cjs`. QA dependencies are development-only. Reports live in `docs/automated-qa.json`, `docs/bilingual-qa.json`, and `docs/theme-qa.json`.

Automated checks cover 16 main pages, reciprocal page links, heading/paragraph/table counts, exact citation destinations, source business information, localized metadata, sitemap, HTML markup, emulated menu/focus interactions, and calculated palette contrast. They do not establish WCAG conformance, rendered mobile/desktop layout, actual VoiceOver/NVDA pronunciation or navigation, or human bilingual user acceptance. Browser QA is unavailable in this managed environment; no browser was installed or substituted.

The owner should review representative pages using VoiceOver on iOS/macOS, including language changes and menu interactions. If automatic voice switching is disabled or a Spanish voice is unavailable, the markup cannot itself supply that voice.
