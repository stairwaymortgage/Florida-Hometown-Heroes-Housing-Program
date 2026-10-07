# 01 — Site audit

**Site:** https://floridahometownheroeshousingprogram2026.com
**Method:** Repo-based audit. The live crawler (`scripts/audit-site.mjs`) was **blocked** —
every request to the live domain returns **403 via the network egress proxy** in this
environment (see `audit/summary.json`). That is an environment restriction, not necessarily a
problem with the live site. All findings below come from reading the repo on branch
`claude/apply-all-sites-1lzqpv`, which is the source of truth (Astro → Vercel).

> **Action for a human:** re-run the crawler from an unrestricted machine to confirm the live
> site returns 200, serves `sitemap-index.xml`, and exposes the county/FAQ schema described below:
> `node .claude/skills/seo-aeo-site-strategy/scripts/audit-site.mjs https://floridahometownheroeshousingprogram2026.com --max 500 --out seo-strategy/audit`

## What the site is about today
A lead-gen + education site for the **Florida Hometown Heroes Housing Program**, run by
Stairway Mortgage (Jim Blackburn, NMLS #1072866). Its editorial angle is deliberate and
differentiating: Hometown Heroes is a **repayable 0% deferred second mortgage, not a grant**.
Entities a search engine would extract: Florida Hometown Heroes, down payment assistance,
Florida Housing Finance Corporation, 67 Florida counties, essential/frontline occupations,
FHA/VA/USDA/conventional first mortgages.

## Page inventory (by type)
| Type | Pages |
|---|---|
| Home / pillar | `/` (index) |
| Program hubs | `/eligible-occupations`, `/income-limits`, `/loan-calculator` |
| Local hub + local layer | `/florida-county-housing-programs` + **67** `/{county}-county-housing-program` pages |
| Conversion | `/contact-us` (lead form), `/schedule-a-call` (booking placeholder) |
| Blog (new in this branch) | `/blog` + `/blog/{slug}` (engine for the n8n auto-poster) |

## Technical / AEO findings (ranked)

### Critical
- **None in the repo.** (The live 403 is an environment/proxy artifact; confirm the live site
  returns 200 from an unrestricted machine.)

### High
- **FAQPage schema exists on county pages only.** `src/pages/[slug].astro` and the new
  `src/pages/blog/[slug].astro` emit FAQPage + BreadcrumbList JSON-LD. The **home page and the
  `/eligible-occupations`, `/income-limits`, `/loan-calculator` hubs have no FAQ schema** even
  where FAQ-style content exists. Answer engines lean on FAQPage. *Fix: add an FAQ block +
  FAQPage JSON-LD to each hub — see `06-page-fixes.md`.*
- **Low question-heading share on the core pages.** H2s that are real questions:
  home 3/15, income-limits 1/8, loan-calculator 1/7, eligible-occupations **0/10**,
  contact 0, schedule 0. AEO target is 60%+ of subheads phrased as questions. *Fix: reheading in `06-page-fixes.md`.*
- **No `llms.txt`.** Add one at `public/llms.txt` (see `00-STRATEGY.md` roadmap).

### Medium
- **Stale "2025" copy in meta + body**, matching the known issue in `CLAUDE.md`:
  - `eligible-occupations` meta: "Complete official **2025** list…"
  - `income-limits` meta: "Complete **2025** county-by-county … income limits."
  - `index` meta: "Complete … guide **2025** …"
  These make the content look dated to both users and crawlers and risk visitors self-disqualifying
  on stale numbers. *Fix: `06-page-fixes.md`.*
- **`schedule-a-call`** is a placeholder (Calendly embed not built; noted in `CLAUDE.md`).
- **Blog was not discoverable** before this branch — now linked from the footer Quick Links.

### AEO readiness score: **5 / 10**
Strong where it counts (county pages are genuinely AEO-shaped: question H2s, FAQPage schema,
answer-first FAQs, breadcrumbs, local entities). Dragged down by: no FAQ schema on the main
hubs, few question headings on the home/hub pages, no `llms.txt`, and stale year copy.

## Cannibalization check
Low risk. The county pages share a template but each targets a distinct `{county}` intent.
Watch one thing as the blog grows: **blog posts and county pages both answer
"Hometown Heroes in {county}" questions.** Keep posts on *sub-questions* (profession in county,
loan type in county) and let the county page own the head "{county} housing program" term —
the `topics` list in `site-config.js` is built that way.
