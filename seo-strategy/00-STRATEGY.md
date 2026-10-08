# Hometown Heroes — SEO + AEO Strategy

**Site:** https://floridahometownheroeshousingprogram2026.com
**Prepared:** 2026-10-07 · For: Jim Blackburn, Stairway Mortgage (NMLS #1072866)
**Scope of this pass:** repo preparation for the n8n Blog Auto-Post engine + a research-backed
content plan. The n8n workflow itself (import, credentials, schedule, test run, activation)
stays with you — this session can only touch the GitHub repo.

> **Two environment limits you should know:** the live site returned **403 to the crawler** and
> **WebFetch to every external domain was blocked** by this sandbox's egress proxy. So the site
> audit is **repo-based** (the repo is the source of truth anyway) and the competitor analysis is
> built from **search results**, not first-hand page fetches. Re-run both from an unrestricted
> machine to deepen them — commands are in `01-site-audit.md` and `03-competitors.md`.

## 1. Verdict
The site is in good shape where it matters most and has one clear, winnable opening. Its 67
county pages are already genuinely AEO-shaped (question headings, FAQPage schema, answer-first
FAQs, local entities, provenance on every number) — better than most competitors. The biggest
opportunity is to **extend that same discipline to the home page and the three hubs** (which have
little FAQ schema and few question headings) and to **own the one question competitors fumble:
"Is Hometown Heroes a grant, or do you pay it back?"** That "repayable second mortgage, not a
grant" angle is already your editorial differentiator; it is also the single best answer-engine
gap. The blog engine is the long-tail machine that pairs each profession and loan type with each
county — 871 posts of intent you don't cover today.

## 2. Targeting: Hybrid, county grain
National question pillars (`/`, hubs) + a 67-county local layer. County is the grain Florida
Housing, searchers, and competitors all use. Full reasoning in `02-targeting.md`.

## 3. Top competitors & the gap
1. **movewithmomentum.com** — the real threat: already publishing per-county DPA pages. Beat on
   structure (answer-first + FAQ schema) and the "not a grant" clarity.
2. **supermoney.com** — strong generic explainer, not county-deep, not a lender.
3. **floridahousing.org / flsenate.gov** — the authorities; cite them, never imitate them.
4. **floridarealtors.org** — approved-occupation news.
5. **crosscountrymortgage / lennarmortgage / rize LO microsites** — brand-strong but thin on
   Florida county depth.

**The gap to exploit:** answer-first + FAQPage at county grain, the "is it a grant?" question,
and the profession-×-county / loan-type-×-county long tail. Details in `03-competitors.md`.

## 4. Top 20 questions to own (and the page that owns each)
| # | Question | Owner page |
|---|---|---|
| 1 | How does Florida Hometown Heroes work? | `/` |
| 2 | Is Hometown Heroes a grant or do you pay it back? | `/` |
| 3 | How much down payment help can I get? | `/` |
| 4 | Who qualifies / what jobs are eligible? | `/eligible-occupations` |
| 5 | What credit score do I need? | `/eligible-occupations` |
| 6 | Does remote work disqualify me? | `/eligible-occupations` |
| 7 | How much can I earn and still qualify? | `/income-limits` |
| 8 | Is it household or borrower income? | `/income-limits` |
| 9 | Can you use it with an FHA loan? | `/loan-calculator` + blog |
| 10 | Can you use it with a conventional loan? | `/loan-calculator` + blog |
| 11 | Does the second mortgage add to my monthly payment? | `/loan-calculator` |
| 12 | Do I have to be a first-time buyer? | `/` + blog |
| 13 | Can teachers use it? | `/eligible-occupations` + blog |
| 14 | Can nurses / healthcare workers use it? | `/eligible-occupations` + blog |
| 15 | Can police / firefighters / EMTs / corrections use it? | `/eligible-occupations` + blog |
| 16 | Can military & veterans combine it with a VA loan? | `/eligible-occupations` + blog |
| 17 | What is the income limit in {my county}? | `/{county}-county-housing-program` |
| 18 | Does {my county} have its own DPA program? | `/{county}-county-housing-program` |
| 19 | Can I combine it with my county's program? | `/florida-county-housing-programs` |
| 20 | When will funding run out / how do I apply? | `/` → `/contact-us` |

## 5. Roadmap
**This week (repo prep — done in this branch / PR):**
- ✅ Blog engine built: content collection + `/blog` + `/blog/{slug}` with Article + FAQPage +
  BreadcrumbList schema, matching the site's design system. Build validated end-to-end.
- ✅ Registry file `src/data/published-niches.json` = `[]` created (the auto-poster's duplicate guard).
- ✅ Strategy skill installed at `.claude/skills/seo-aeo-site-strategy/` (committed for the team).
- ✅ Blog linked from the footer so it isn't orphaned.
- ✅ `site-config.js` produced (13 topics, 871-post matrix) — drop into the n8n Site Config node.

**30 days (recommended, needs your go-ahead — copy changes):**
- Add FAQ blocks + FAQPage JSON-LD to `/`, `/eligible-occupations`, `/income-limits`,
  `/loan-calculator` (reuse the county-page markup). See `06-page-fixes.md`.
- Convert statement H2s to questions on those pages (eligible-occupations has 0 today).
- **Refresh the stale 2025 copy/tables** to verified 2026 figures (flagged in `CLAUDE.md`).
- Add `public/llms.txt`; confirm live `robots.txt` points to `sitemap-index.xml`.
- Turn the blog on (steps in §6) at ~1 post/day and watch the first week.

**90 days:**
- Full blog matrix running; point blog topics at county pages as the long tail matures.
- Build the Calendly embed on `/schedule-a-call`.
- Roll the same repo-prep to the next sites (you chose Hometown Heroes first; the pattern and
  the `site-config.js` template now exist to clone).

## 6. Turning the blog on (your n8n steps — not automatable from here)
1. In n8n, duplicate/open the Blog Auto-Post workflow; open the **Site Config** node.
2. Paste the body of `seo-strategy/site-config.js` over its `SITE` object (keep the node's
   `COUNTIES` array, the FILL_ME safety check, and `return [{ json: SITE }];`).
3. Confirm credentials on the GitHub, Anthropic, OpenAI and R2 nodes.
4. Set **Error workflow → "Blog Auto-Post — Error Alert"**.
5. **Execute once.** Confirm: one `.md` committed to `src/content/blog/`, registry updated,
   image in R2 opening at its URL, post live at `/blog/{slug}` after Vercel deploys.
6. Run again → confirms it picks the **next** topic. Then set the schedule and activate.

Everything else is `programFacts`: leave it empty until you've confirmed current figures against
floridahousing.org / eHousingPlus (the repo's `config/program-2026.json` is your verified source).

## 7. How we'll measure
- GSC impressions/clicks on **question queries** (filter queries containing who/how/can/is).
- Pages indexed (blog posts appearing in `sitemap-index.xml` and GSC coverage).
- **AI citation spot-check:** monthly, ask ChatGPT, Perplexity and Gemini the top-20 questions
  above and log whether this site is cited.
- Leads from `/contact-us` tagged `src=blog`.
