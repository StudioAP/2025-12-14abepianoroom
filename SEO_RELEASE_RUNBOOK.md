# SEO Release Runbook

## Scope
- Production URL: `https://abepianoroom.netlify.app/`
- SEO stack: GA4 + Google Search Console
- Address policy: district-level only

## Phase 0 (before release)
1. Set real credentials
- Replace `GA4_MEASUREMENT_ID` in `index.html`
- Replace `google-site-verification` token in `index.html`

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
