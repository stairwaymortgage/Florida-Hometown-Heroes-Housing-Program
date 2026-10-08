---
name: seo-aeo-site-strategy
description: Full SEO + AEO strategy for one of Jim Blackburn's websites. Audits the live site and its repo, finds real competitors, mines the questions people ask, decides local vs national vs hybrid targeting, maps every keyword to a page, and outputs a question-first content plan plus a ready-to-paste Site Config for the n8n Blog Auto-Post workflow. Use when asked to analyze a website, do competitor or keyword research, plan topics/niches, or "bring the best out of" a site.
---

# SEO + AEO Site Strategy

You are running a complete search strategy for **one website**. The end goal is **AEO**
(Answer Engine Optimization): getting the site quoted by Google AI Overviews, ChatGPT,
Perplexity, Gemini and Claude. Everything you recommend must be **question-and-answer
shaped**. Classic SEO (rankings, links, technical health) is the foundation AEO stands on,
so do both.

Work through the phases in order. Don't skip ahead to recommendations before the audit
and research are done. Save every output into a `seo-strategy/` folder at the repo root
(create it). Write findings to files as you go, not only in chat, so the work survives a
long session.

Read these before Phase 5:
- `references/aeo-playbook.md`: how answer engines pick sources, and the page patterns that win
- `references/output-formats.md`: exact columns/fields for every output file, including the n8n Site Config
- `references/compliance.md`: rules every mortgage-related recommendation and sample copy must obey

---

## Phase 0: Intake (ask once, then work unattended)

Collect, from the user or the repo, before researching:
1. **Site URL** (canonical, with or without `www`) and **repo path** (default: current directory).
2. **What the business sells and to whom.** Check the homepage, README, `CLAUDE.md` and any
   context docs in the repo first. Only ask about what you can't find.
3. **Where customers are:** one city, a region, a state (e.g. all 67 Florida counties), or nationwide.
4. **The conversion:** what counts as a lead (form page, booking link, phone).
5. **Paid SEO tools available?** Jim's team has Ahrefs, Semrush and Google Search Console.
   If the user can export data (GSC queries/pages, Ahrefs or Semrush keyword and competitor
   exports), ask for the CSVs and drop them in `seo-strategy/inputs/`. Real search volume and
   current-ranking data beat estimates. If none are available, continue with free methods and
   label volumes as **estimated**.

State your understanding in 3–5 lines, then proceed. Don't wait for approval unless something
is genuinely ambiguous.

---

## Phase 1: Audit the site as it is

**1a. Crawl the live site** with the bundled script (Node 18+):

```bash
node .claude/skills/seo-aeo-site-strategy/scripts/audit-site.mjs https://example.com --max 500 --out seo-strategy/audit
```
(Adjust the path if the skill is installed at user level: `~/.claude/skills/...`.)

It reads `robots.txt` and the sitemap(s), then for every page records: status, title, meta
description, canonical, H1s, H2/H3s, **how many headings are questions**, word count, internal
and external links, JSON-LD schema types, FAQ presence, image alt coverage, noindex, OG tags.
It also checks for `llms.txt`. Outputs: `audit/pages.csv`, `audit/summary.json`, `audit/report.md`.

If the network blocks the crawl, audit from the repo instead: read the routes/pages and
content collections, and build the same table by hand.

**1b. Audit the repo:** framework (Astro / static HTML / other), how pages and blog posts are
generated, content collection schemas, where `<head>`/meta/schema are rendered, sitemap and
robots config, and whether FAQ frontmatter is actually rendered as **FAQPage JSON-LD**. Many
sites store FAQs but never output the schema.

**1c. Write `seo-strategy/01-site-audit.md`:**
- What the site is about today, as a search engine would read it (top topics and entities)
- Page inventory by type (home, hubs, service/program pages, local pages, blog, tools)
- Technical issues ranked **Critical / High / Medium**, each with file path + fix
- AEO readiness score (0–10) with reasons: question headings, answer-first paragraphs, FAQ
  schema, author/entity schema, llms.txt, freshness dates, citations
- Cannibalization: pages competing for the same intent

---

## Phase 2: Decide the targeting model

Using `references/aeo-playbook.md` § Targeting, decide and **justify in writing**:
- **Local:** the service is delivered in a place, or the query includes a place ("near me", city, county).
- **National:** an informational or product topic where location doesn't change the answer.
- **Hybrid (most of Jim's sites):** national question pillars + a local layer (county/city
  pages and localized posts) that links back up to the pillars.

Also decide the **geographic grain** (state → county → city) by checking whether competitors
and searchers actually use county names, city names, or neither. Search a few examples.
Write it into `seo-strategy/02-targeting.md`.

---

## Phase 3: Find the real competitors

Competitors are **whoever answers the questions you want to own**, not just businesses like Jim's.

1. Build 15–30 seed queries from Phase 0–2: core service terms, the main audience's questions,
   and 5+ local variants.
2. Run each through **WebSearch**. Record every domain that appears in the top results,
   counting how often. Also note who is cited in answer-style results when visible.
3. Classify the domains: **direct** (same offer), **information** (government and program sites,
   media, big publishers), **aggregators/marketplaces**. Pick the top 5–8 to study, mixing direct and information.
4. For each one, **WebFetch** their key pages (home, top hub, 2–3 ranking articles, FAQ page) and record:
   page types and URL structure, topics covered, question headings used, answer format, schema,
   local pages (and how deep they go), content freshness, trust signals (author, credentials,
   reviews, citations), CTAs.
5. **Gap analysis:** topics or questions they cover that the site doesn't; questions **nobody**
   answers well (the best AEO opportunities); formats they use that win (calculators,
   checklists, tables, comparisons).

Write `seo-strategy/03-competitors.md` with a comparison table and the gap list.
If WebFetch is blocked for a site, say so and move on. Don't work around it.

---

## Phase 4: Keyword and question research

Goal: a **question bank**, not just a keyword list. Answer engines respond to questions.

Sources, from strongest to weakest:
1. **GSC export** (if provided): queries the site already gets impressions for, especially
   question queries and anything at positions 5–20 (fast wins).
2. **Ahrefs/Semrush exports** (if provided): volume, difficulty, the "Questions" reports, competitor top pages.
3. **Search results:** People Also Ask style questions, related searches, and question headings
   on the competitor pages you fetched.
4. **Community language:** WebSearch `site:reddit.com <topic>` and forum results. Capture how real
   people phrase the problem, including fears, misconceptions and comparisons.
5. **Modifier expansion:** for every core topic, generate who / what / how / how much / how long /
   can I / do I qualify / vs / best / near me / {location} / {year} / for {audience} variants.

For every keyword or question, record: intent (informational / commercial / transactional /
local / navigational), funnel stage, audience, location modifier, volume (real or estimated
H/M/L), difficulty (real or estimated), SERP features seen, AEO likelihood (H/M/L, meaning
whether answer engines answer it directly), and current ranking URL if known.

**Cluster** into topics: one cluster = one primary question + its supporting questions = one
page (or one pillar with spokes). Never give two pages the same primary intent.

Save `seo-strategy/question-bank.csv` and `seo-strategy/keyword-clusters.csv` (formats in
`references/output-formats.md`).

---

## Phase 5: Topic architecture and placement map

Read `references/aeo-playbook.md` first.

1. **Architecture.** Design the hub-and-spoke structure:
   - **Pillars:** national question hubs ("What is X and who qualifies?")
   - **Spokes:** audience pages (by profession or situation) and specific-question articles
   - **Local layer:** location pages that answer the local version of the pillar questions
     and link up to the pillar and across to neighbouring locations only through hubs
   - **Tools/assets:** calculators, checklists, comparison tables. These earn links and citations.
   Draw it as a tree in `seo-strategy/05-architecture.md`.

2. **Placement map:** `seo-strategy/keyword-map.csv`, one row per target URL (existing or new):
   primary question, secondary questions, title tag, H1, meta description, H2s (written as
   questions), answer-first summary (40–60 words), FAQ questions (5–8), schema types, internal
   links in and out, and action (keep / rewrite / merge / create / redirect).
   **Never map a keyword to a URL that doesn't exist without marking it `create`.**

3. **Fixes for existing pages:** `seo-strategy/06-page-fixes.md`, page by page, with the
   exact new title, H1, question H2s and answer-first opening. Mark which can be applied
   automatically.

---

## Phase 6: Blog engine configuration (the n8n Blog Auto-Post)

Jim's blog runs on an n8n workflow whose only site-specific node is **Site Config**
(see `references/output-formats.md` § Site Config). From the research, produce
`seo-strategy/site-config.js`, a complete drop-in replacement for that node's
`SITE` object, containing:
- `topics`: one entry per **blog-worthy question cluster** that isn't better served by a
  static page. Each topic has `niche` (short name), `question` (the primary question the post
  answers), `url` (the hub or money page it should push readers to; must exist), `cat`, `tags`,
  `noVA` where required, and an optional `trendQuery`. Order by priority: fast wins first.
- `locations`: the grain chosen in Phase 2 (counties, cities, or `["Nationwide"]` with `suffix: ""`).
- `links.allowed` and `labels`: real hub URLs only.
- `trends.queries`: news queries per topic keyword.
- Keep all compliance values from `references/compliance.md` for mortgage sites.

Also report: total posts the matrix creates (topics × locations), and a recommended
posting frequency.

---

## Phase 7: Strategy report and roadmap

Write `seo-strategy/00-STRATEGY.md`, the document Jim reads. Keep it plain-language and
skimmable:
1. **The one-paragraph verdict:** where the site stands and the biggest opportunity.
2. **Targeting decision** (local/national/hybrid) and why.
3. **Top 5 competitors** and the gap you'll exploit.
4. **Top 20 questions to own**, with the page that will own each.
5. **Roadmap:**
   - *This week:* critical technical and schema fixes, quick-win page rewrites
   - *30 days:* pillar and hub pages, FAQ schema everywhere, llms.txt, local pages for top locations
   - *90 days:* full local layer, blog engine running, link-earning assets
6. **How we'll measure:** GSC impressions and clicks on question queries, pages indexed,
   AI citation spot-checks (ask ChatGPT, Perplexity and Gemini the top 20 questions monthly and
   log whether the site is cited), leads.

---

## Phase 8: Implement (only with approval)

After the report, offer to implement in the repo. With the user's go-ahead:
- Apply technical fixes and schema (FAQPage, Organization/LocalBusiness or FinancialService,
  Person for the author, BreadcrumbList, Article with dates).
- Add `llms.txt` (see playbook).
- Rewrite approved pages to the question-first pattern.
- Build new hub, pillar and local pages using the site's existing design system and components.
- Run the site build locally; fix errors before committing.
- **Never push or deploy without explicit approval.** On Jim's sites, pushing the default
  branch deploys straight to production.

---

## Ground rules
- **Verify, don't invent.** No made-up search volumes. Label estimates. No invented statistics,
  program figures, prices or rankings. Program details (limits, amounts, deadlines) only from
  official sources fetched this session, with the URL and date noted.
- **Compliance first:** every title, heading, FAQ answer and sample paragraph you write must
  pass `references/compliance.md`.
- **One intent per URL.** Resolve cannibalization before adding pages.
- **Existing URLs are sacred.** Never change a live slug without a 301 plan.
- Prefer improving and consolidating existing pages over adding thin new ones.
- Keep chat updates short. The files are the deliverable.
