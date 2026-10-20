# Elevate Access Solutions — website rebuild review

Audit and development date: October 19, 2026. This is a private review draft, not an approved migration or a WCAG conformance certification.

Latest approved revisions: Juanita’s biography now states that she has been a RESNA-certified Assistive Technology Professional since 2023. Consultation-request prompts and the email-preparation form were removed. Contact information is shown directly, with a selectable email link and phone link.

## Preview and review

Private draft: https://elevate-access-solutions-draft.fmlarios92.chatgpt.site

Open it while signed into the ChatGPT account that owns the Site. Review Home, About Us, Meet the Founders, Services, Insights, Contact, and Website Accessibility. At narrow widths, the Menu button reveals navigation; Escape closes it. No live-domain, DNS, Google Workspace, or subscription settings were changed.

Suggested review sequence: navigate each page with VoiceOver's heading and link commands; open and close the mobile menu; find and copy the contact email address; review the biographies and services for factual currency. The site has no contact-submission form or email-preparation workflow.

## What was built

Seven content pages with a shared header, navigation, footer, reusable layouts, local images, consistent navy and dark-blue branding, readable system typography, and responsive CSS. The five principal page slugs remain recognizable: home, about, founders, services, and contact. Insights supplies an empty educational publishing structure; no unpublished article was imported or invented. A website-accessibility page describes the target and feedback channels without claiming conformance.

The new source separates business content, page templates, CSS, interaction code, images, and deployment configuration. It has no frontend framework or visitor-facing runtime dependency. The static build uses Python's standard library.

Preserved: the published white logo; the three detailed service descriptions; all six audience groups; the mission and approach; both founders' complete first-person biographies, including the published credential and experience claims; info@elevateaccess.us; and (510) 224-5251. Founder credentials and years of experience were retained from the business's published website, not independently certified. No rate, response-time promise, partnership, client logo, testimonial, booking destination, or new certification was added.

Improved: the homepage gives service and audience context, service links have descriptive destinations, navigation accommodates Insights, text hierarchy and spacing are consistent, image crops no longer dominate the headline, page metadata is complete, and the contact workflow explains exactly what it does. The founder portraits supplied in My Drive were added on October 19, 2026, with responsive WebP exports and concise, image-specific alternatives. Neither portrait was retouched or cropped.

## Existing website audit

The apex domain redirected to https://www.elevateaccess.us/. The five primary navigation destinations returned HTTP 200 when retrieved. The existing site uses Squarespace, a white horizontal logo, navy backgrounds, light-blue links, Meno Banner headings, and Archivo Narrow content text. Its homepage has one primary call to action, “Request a consultation,” leading to Contact. Services has three service-information links. About and Contact have direct email and phone links; founders and services repeat email/contact calls to action.

| Current route | Retrieved content and findings |
| --- | --- |
| `/` | Accessibility positioning, consultation CTA, one workstation image, and a repeated accessibility-topic strip. Little service detail on the homepage itself. |
| `/about` | Mission, approach, six audiences, five reasons to choose the business, founder link, email and phone. |
| `/founders` | Juanita Herrera and Fernando Macias biographies, published RESNA ATP claim for Juanita, shared perspective, and visible photograph placeholders. |
| `/services` | Assessments; Assistive Technology Training; Workplace Accessibility Consulting. Full published descriptions preserved. Pricing available by inquiry; no price list published on this page. |
| `/contact` | Email and phone links and a workplace image. No form submission mechanism was present on the main Contact page. |

All five main pages have descriptive page titles and canonical metadata, but each retrieved meta description is empty. The site uses Squarespace's default favicon. Social metadata references a white logo using HTTP asset URLs in some tags. The public sitemap includes former backups and rebuild variants, creating redundant discovery paths that deserve consolidation. These are confirmed quality and SEO concerns, not proof of a ranking penalty.

The sitemap listed 12 page URLs: `/home`, `/about-original-backup`, `/meet-the-founders`, `/services-original-backup`, `/contact-original-backup`, `/founders-original-backup`, `/founders`, `/services`, `/contact`, `/home-rebuild`, `/about`, and `/about-1`. In addition to the five primary pages, `/home`, `/about-original-backup`, and `/services-original-backup` were retrieved. Five secondary URLs returned HTTP 429 during retrieval: `/meet-the-founders`, `/contact-original-backup`, `/founders-original-backup`, `/home-rebuild`, and `/about-1`. Their contents remain an audit gap; the rate-limit response is not evidence that those URLs are broken. No article collection was found in the retrieved navigation or sitemap.

The original desktop homepage was inspected in a browser at 1363 × 936 CSS pixels; it did not have horizontal overflow at that size. Its large serif headline occupies much of the opening viewport and its workstation image is heavily cropped. Services and Contact were inspected through the browser accessibility tree. A main landmark, a single h1, meaningful service-link names, and a skip link are already present; the rebuild does not incorrectly present those as wholly absent from the original. Static parsing confirmed a single complete h1 on the main pages; multiple text fragments inside its spans were not counted as multiple headings.

One original skip-link style was observed as dark text on a dark-blue background, warranting a focused-state contrast check. The homepage image's initial HTML alt attribute was empty, while the runtime browser exposed a meaningful description. This inconsistency is avoided by placing meaningful alternatives directly in the replacement HTML. Mobile behavior, zoom, focus traversal, and full original-site WCAG conformance were not verified. No main-navigation broken link was confirmed.

## Assets

Five original assets were retrieved and retained with source URLs and byte sizes in `docs/audit/asset-provenance.json`. Original bytes are also included in the backup. Three existing informative images, the original logo, and the two founder portraits located in My Drive are used in the draft; no stock founder photos were substituted. The contact-page image was retained in the archive but omitted from the layout because the asset itself contains an embedded cookie-banner strip.

The main workstation image was optimized from approximately 2.27 MB to 38 KB, while keeping its whole scene. Other reused image files are approximately 43–49 KB and the logo is approximately 30 KB. These are file-size measurements, not a claim about real-world loading speed. Assets are local to the new site rather than hotlinked to Squarespace.

## Accessibility implementation and evidence

Target: WCAG 2.2 Level AA. Conformance is not yet established.

Implemented: semantic header, navigation, main and footer landmarks; one h1 and ordered subheadings per page; a first-in-order skip link; native buttons, links, inputs and select controls; visible focus outlines; minimum 44–48 px primary control targets in the design; no fixed overlay obscuring focus; a mobile menu with expanded state, Escape handling and return focus; selectable contact information; meaningful image alternatives and explicit dimensions; flexible layouts and no fixed text-area height; reduced-motion and forced-color support; and no visual CAPTCHA or keyboard trap.

The site has no data-collection form. No browser storage, server database, analytics, tracking code, or marketing sign-up was added.

Confirmed automated results across all seven main pages:

- HTML Validate: zero reported errors after correcting the findings.
- axe-core in JSDOM: zero reported violations in the evaluated WCAG and best-practice rules. Rendered color-contrast checking was disabled because JSDOM has no browser layout engine. Two rule groups required review because of that limitation; independent markup checks confirmed one main landmark and one h1 per page.
- Structural checks passed for 140 internal link/fragment references and 20 local image references; unique IDs and page titles; heading order; canonical URLs; descriptions; JSON-LD; and private-draft indexing controls.
- Behavioral checks passed for menu state, Escape and focus restoration. Content checks confirmed the verified contact details, the updated certification wording, and removal of consultation requests and all forms.
- Exact published service descriptions and founder biographies were compared with the source content. No article was published.
- Eighteen specified design-token contrast pairs met their respective text or nontext thresholds. The lowest calculated text pair was 5.80:1. This does not establish contrast coverage for every rendered state.
- JavaScript syntax and Python compilation passed. No inquiry form or email-preparation code remains.

The QA report records tool versions and detailed results in `docs/automated-qa.json`. Automated tools and emulated focus do not replace human interaction tests.

Still untested: real desktop/mobile rendering, physical keyboard tab order and touch behavior, 200% text resizing, 400% zoom / 320 CSS-pixel reflow, user text spacing, actual focus visibility in every state, rendered nontext contrast, image crops and layout shifts, VoiceOver on macOS/Safari and iOS/Safari, NVDA on Windows, copying the displayed email on different devices, actual page load/Core Web Vitals, deep-link and 404 behavior on the deployed host, and the ChatGPT administration UI with VoiceOver. The supported managed-browser QA capability was unavailable, so no substitute local browser server was used and no new-site screenshot review is claimed.

## Contact information

At Fernando's request, all consultation-request prompts and the email-preparation form were removed. The contact page and shared contact sections display info@elevateaccess.us as a selectable email link and (510) 224-5251 as a telephone link. Visitors can copy the email address into their preferred email service. There is no form, automated delivery, server submission, or form-processor dependency. Selecting an email link opens the visitor’s configured email app; the address can also be copied.

No external message was sent. Automatic form delivery is no longer a launch requirement for the selected design.

## Sites capabilities and administration

| Area | Confirmed capability or implementation | Limit / acceptance requirement |
| --- | --- | --- |
| Private draft | Native Site creation starts private; owner-private deployment is available. | Owner signs into ChatGPT to view. Private drafts cannot serve as public search results. |
| Custom domain | Native domain attachment supports a subdomain CNAME target, apex A targets, and validation records. | Not attached or tested here. Exact values must come from Sites after explicit migration authorization. |
| Multiple pages | Implemented as individual static HTML documents with clean folder paths. | Deep links, slash normalization and 404 status need hosted checks. |
| Text and services | Shared source content can be edited conversationally, rebuilt, versioned and deployed. | Changes require a connected Sites conversation and successful deployment; there is no promised direct visual CMS. |
| Articles | Source-driven article template, index and sitemap generation are implemented. | No built-in editorial dashboard, scheduled publishing, RSS, site search, comments, or editorial roles were added. Draft articles are excluded. |
| Images, pages, navigation | Editable source files and shared templates support these operations through ChatGPT. | Image rights, alternatives and factual changes still require judgment. Not tested with VoiceOver in the administration UI. |
| Contact | Verified email address is a selectable mailto link, with a phone link. | No submission form or automatic delivery is needed for the chosen design. |
| SEO | Titles, descriptions, canonical links, Open Graph/Twitter tags, JSON-LD, robots and XML sitemap are implemented in source. | No ranking guarantee, search-console setup, rendered crawler inspection or built-in SEO dashboard was verified. |
| Source and history | Sites provides a source repository, saved versions and deployment workflow. | Hosting access policy, ChatGPT account routing, domain attachments and saved version history depend on Sites. |
| Independent export | Source, JSON content, original/local assets, generated output and documentation can be copied as ordinary files. | The private access gate and platform history are not included in a portable static build. |

The key independence improvement is that you can request routine content, image, page, navigation and publishing changes in conversation, without navigating a Squarespace canvas. The ability to perform those source operations is real; the accessibility of every ChatGPT account, approval, login and publication interface has not been tested with VoiceOver. Do not equate conversational source control with a certified accessible administration interface. Initial account authorization, any required runtime approval, and account recovery may still require interaction outside a simple content request.

## SEO and migration readiness

The preview deliberately has `noindex, nofollow`, robots exclusion, private access and a visible review label. Canonicals and sitemap refer to the draft hostname. Launch requires an explicit production build and verified public host settings; leaving either the access gate or noindex in place would prevent normal public discovery.

No custom-domain or DNS mutation has been made. A read-only public DNS snapshot confirmed Porkbun nameservers; Squarespace website A/CNAME records; Google Workspace MX `1 smtp.google.com.`; a Google verification TXT; and a public DKIM key at `google._domainkey`. The apex TXT lookup did not return an SPF record. The `_dmarc` lookup returned a CNAME to `pixie.porkbun.com`; the effective DMARC policy was not established. This snapshot is not a full zone export and does not enumerate every DKIM selector. Preserve the actual records and verify the complete email configuration before any cutover; do not replace them from a generic example.

Before seeking final migration approval:

- Complete the real-browser and assistive-technology acceptance tests above, including admin workflows with Fernando's VoiceOver setup.
- Have Fernando review factual currency of services, biographies, credential wording and contact information. Review the supplied founder portraits and their text alternatives.
- Verify that visitors can read and copy the email address and activate the phone link using their preferred assistive technology.
- Obtain a fresh full Porkbun DNS export and a Squarespace content/settings backup. Record all A, AAAA, CNAME, MX, TXT, DKIM, DMARC, verification and CAA entries and their TTLs. Keep nameservers unchanged.
- Decide the canonical hostname. The current live site uses `www`; retaining that is the recommended default. Prepare both apex and `www` bindings and the one-hop canonical redirect, without inventing DNS targets.
- Add exact Sites-supplied domain validation records only after authorization. Replace only website routing records, preserving all email and unrelated verification records. Check IPv6 AAAA and CAA compatibility as well as A/CNAME.
- Implement and verify permanent HTTP 301/308 redirects for legacy URLs in `docs/redirects.csv`. HTML refresh/canonical fallback pages exist, but do not constitute verified server redirects. Confirm slash variants of main pages and that unknown URLs return a true 404.
- Rebuild using `--origin https://www.elevateaccess.us --public`; check every canonical, sitemap URL, internal route, social tag, robots directive and structured-data identity. Confirm no preview-only access gate or noindex remains on the public business host.
- Preserve Search Console verification. Submit the final sitemap and inspect representative URLs when public. Keep the same domain; a hosting move does not require changing business email.
- Establish a low-traffic launch window, expected DNS caching window, exact routing-only diff, old record values and rollback trigger. Keep Squarespace active during propagation and monitoring.
- Request Fernando's explicit authorization for that concrete DNS diff and live-domain publication. No prior draft-development authorization should be interpreted as approval to cut over.

After an approved cutover, verify apex and `www` HTTPS, certificates, all page/alias statuses, contact details, mobile and screen-reader use, inbound/outbound business email and authentication results, Search Console access, 404 logs and page performance. Monitor search and traffic while both hosts are available. If key routes or contact details fail, restore only the prior website DNS values; leave email and nameservers alone. Do not cancel Squarespace until the move is stable and Fernando separately authorizes cancellation. Google recommends preparing and testing new hosting, switching DNS, monitoring both hosts, and retiring the old service only after traffic has moved.

## Maintenance through ChatGPT Work

Open a conversation identifying this Site by its URL and give a concrete change. For example: “Update the Assistive Technology Training description to the following approved text. Keep the draft private, run the relevant checks, and give me the updated preview.” Or: “Prepare an Insights article from this attached final text. Use me as the confirmed author, show me the private preview, and do not publish it to the live business domain yet.”

For images, attach the approved replacement and describe its purpose; ask ChatGPT to optimize it, write suitable alt text, and check responsive display. For pages/navigation, describe the destination and preferred label. For contact details, supply the exact new value and ask for a site-wide update and verification. You can ask for a rollback to a named saved version.

Once a live-site workflow is explicitly authorized, distinguish “prepare a draft” from “publish the approved change.” Routine maintenance involves retrieving the current Site source, modifying shared content/templates, rebuilding, checking changed behavior, saving a version and deploying to the intended audience. Ask for a brief change summary and remaining test limits each time. Account/DNS changes, costs and third-party communications retain their separate authorization boundaries.

## Backup and portability

The independent ZIP includes source templates, CSS/JavaScript, business-content JSON, original and optimized images, generated HTML, metadata/sitemap/robots files, dependency lockfiles for development QA, the audit inventory, read-only DNS snapshot, redirect mapping, README, this review and test results. It excludes source-write credentials, `.git`, environment files, browser sessions and node_modules. There are no runtime secrets in this implementation.

A different host can serve the generated `dist/` folder at its root using directory-index routing. Set that host's canonical origin and rebuild first. Only hosting setup, access restrictions, custom domain routing and permanent redirect configuration need host-specific work. The site does not require ChatGPT to render. Future ChatGPT edits still depend on access to the code and a deployment workflow on whichever host is chosen.

## Source references

Business content: https://www.elevateaccess.us/ and the primary `/about`, `/founders`, `/services`, `/contact` pages retrieved on the audit date. Copies and retrieval gaps are recorded in the audit folder.

Platform capabilities: the installed Sites skill and native Site creation, custom-domain, source, version and private-deployment tool contracts available in this session. Tool availability is evidence of supported operations, not proof that a custom domain or administration screen was tested.

- Google hosting migration guidance: https://developers.google.com/search/docs/crawling-indexing/site-move-no-url-changes
- Google URL migration and redirect guidance: https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
- Google Workspace MX guidance: https://support.google.com/a/answer/6156494
- Google Workspace SPF guidance: https://support.google.com/a/answer/33786
- Formspree plans: https://formspree.io/plans
- Formspree spam prevention: https://help.formspree.io/articles/troubleshooting/how-to-prevent-spam/
- Formspree CAPTCHA settings: https://help.formspree.io/articles/form-and-project-settings/recaptcha-settings/
- Cloudflare Turnstile overview: https://developers.cloudflare.com/turnstile/
