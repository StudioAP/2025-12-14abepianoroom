# SEO Release Runbook

## Scope
- Production URL: `https://abepianoroom.netlify.app/`
- SEO stack: GA4 + Google Search Console
- Address policy: district-level only

## Status Snapshot (2026-03-04)
- Google Search Console verification tag: configured in `index.html`
- GA4 measurement ID: configured in `index.html` (`G-YJ8P67WYLQ`)
- Local checks: `node scripts/seo_release_audit.mjs` = PASS
- Local checks: `node scripts/check_content_master_consistency.mjs` = PASS
- Handoff details: `GSC_GA4_HANDOFF_2026-03-04.md`
- User instructions: `USER_SEO_AI_ACTIONS_2026-03-04.md`
- Admin execution brief: `GOOGLE_ADMIN_AI_EXECUTION_BRIEF_2026-03-04.md`

## Google Admin Handoff Rule
- Current phase is operations handoff, not code implementation.
- Use a single response to the admin operator:
  - Site-side implementation is complete for `https://abepianoroom.netlify.app/`.
  - Proceed with Search Console ownership/sitemap/URL inspection and GA4 DebugView/Realtime checks.
  - Return status as `PASS/FAIL/保留` with cause classification:
    - 反映待ち
    - 権限不足
    - 計測未到達
- Escalate to code changes only if admin-side checks fail after cache/latency windows.

## Definition Of Done (Ops Acceptance)
- GSC ownership is verified.
- Sitemap submission is successful.
- Top URL inspection result is obtained (and request indexing if needed).
- GA4 Realtime receives `page_view`.
- GA4 DebugView receives `contact_click`, `rhythmic_link_click`, `scroll_depth_50`, `scroll_depth_90`.
- `contact_click` is set as Key event.
- Status report is submitted in the standard table format with evidence links.
- T+1 / T+3 / T+7 / T+14 checkpoints are completed.

## AI Search Crawler Policy (Decision)
- Policy: allow search bot only.
- `OAI-SearchBot`: Allow
- `GPTBot`: Disallow
- Note: this requires `robots.txt` update and is a separate request for the site implementation owner.

## Phase 0 (before release)
1. Confirm credentials
- Confirm `GA4_MEASUREMENT_ID` in `index.html` is not placeholder
- Confirm `google-site-verification` in `index.html` is not placeholder
- Only if rotated, replace both values and rerun checks

2. Run local checks
- `node scripts/check_content_master_consistency.mjs`
- `node scripts/seo_release_audit.mjs`

3. Deploy
- Confirm `robots.txt` and `sitemap.xml` are publicly accessible
- Confirm `index.html` source includes canonical/JSON-LD/OG/Twitter tags

4. Search Console
- Add URL-prefix property: `https://abepianoroom.netlify.app/`
- Verify ownership
- Submit sitemap: `https://abepianoroom.netlify.app/sitemap.xml`
- Request indexing for top page

5. GA4
- Confirm `page_view` in Realtime
- Click each contact link and confirm `contact_click`
- Click each rhythmic link and confirm `rhythmic_link_click`
- Scroll to 50% and 90% and confirm `scroll_depth_50` / `scroll_depth_90`

## Phase 1 (day 1-14)
1. Index coverage
- Search Console > Pages: ensure top URL is indexed

2. Query review
- Search Console > Performance: brand + local terms
- Review CTR and average position

3. CTA performance
- GA4 events: compare `contact_click` by `placement`

4. GBP setup
- Update business profile category/description
- Use UTM for inquiry URL

## Phase 2 (monthly)
1. Weekly report
- Search Console: queries, indexed pages, issues
- GA4: events by placement, total contact clicks

2. Pre-deploy gate
- Run `node scripts/seo_release_audit.mjs --strict`

3. Continuous improvement
- Improve meta copy from low-CTR query insights
- Keep image optimization and cache policy updated
