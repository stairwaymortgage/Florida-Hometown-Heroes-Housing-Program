# AEO Playbook: how to get quoted by answer engines

## 1. How answer engines choose what to cite
Google AI Overviews, ChatGPT search, Perplexity, Gemini and Claude all retrieve web pages
and then pull short passages that answer the question. A page gets cited when it is:
1. **Findable:** indexed, crawlable, not blocked, fast, with a clean canonical. If classic
   SEO fails, AEO fails.
2. **Directly answering:** the answer to the exact question sits in a self-contained
   passage near the question, not buried in paragraph six.
3. **Extractable:** clear structure (question headings, short paragraphs, lists, tables,
   definitions) and schema that labels what the content is.
4. **Trustworthy:** a named author with credentials, a clear business identity, consistent
   facts across the web, citations to primary sources, recent update dates.
5. **Specific:** concrete steps, numbers from official sources, and local detail beat generic copy.

## 2. The question-first page pattern (use on every page and post)
```
H1: The primary question, or a title that contains it
[Answer-first block] 40–60 words that fully answer the H1 on their own.
  Start with the direct answer ("Yes, ..." / "X is ..." / "Most buyers need ...").
  No preamble, no "In this article".
[Key facts] 3–6 bullets or a small table (who, what, how much, how long), sourced
H2: Supporting question 1?
  First sentence answers it directly; then explain, with examples
H2: Supporting question 2?
  ...
H2: How does this work in {Location}?   ← local layer
H2: What should you do next?            ← steps + CTA
FAQ: 5–8 more questions, each answered in 2–3 sentences → FAQPage JSON-LD
Author box: name, credentials (NMLS), short bio → Person schema
"Last updated" date (visible, plus dateModified in schema)
```
Rules:
- **H2s and H3s are real questions** in the searcher's words ("Can teachers use...?",
  "How long does ... take?"). Aim for 60%+ of subheadings as questions.
- **First sentence under each question = the answer.** Make it quotable on its own.
- One idea per paragraph, 2–4 sentences.
- Use the **exact question wording** from the question bank. Don't paraphrase it into marketing.
- Define terms the first time ("A one-time close construction loan is ...").
- Include at least one list or table per page. Answer engines lift these readily.
- Name the entity consistently (same business name, person name, NMLS) on every page.

## 3. Schema (JSON-LD) checklist
| Page type | Schema |
|---|---|
| Every page | `Organization` (or `FinancialService` / `LocalBusiness` for the lender), `WebSite`, `BreadcrumbList` |
| Articles/blog | `Article` or `BlogPosting` with `author` → `Person`, `datePublished`, `dateModified`, `image` |
| Any page with Q&A | `FAQPage` (one per page; the questions must be visible on the page) |
| Step-by-step guides | `HowTo` (only if genuinely steps) |
| Local pages | `LocalBusiness`/`FinancialService` with `areaServed` set to the county or city |
| Author | `Person` with `jobTitle`, `identifier` (NMLS), `sameAs` (profiles) |

Notes:
- Google shows FAQ rich results only for a narrow set of authoritative sites, but **FAQPage
  markup still helps machines parse Q&A**. Keep it, and never mark up hidden content.
- Validate with Google's Rich Results Test and the Schema.org validator before shipping.

## 4. Site-level AEO signals
- **`/llms.txt`:** a short Markdown file at the site root listing the site's purpose, key
  pages and question hubs. It's a proposed convention with uncertain impact, but cheap; add it.
- **AI crawler access** in `robots.txt`: check whether GPTBot, OAI-SearchBot, ChatGPT-User,
  PerplexityBot, ClaudeBot and Google-Extended are blocked. Blocking them removes the site from
  those answer engines. **Flag this as a decision for the owner. Don't change it silently.**
- **Sitemap** with accurate `lastmod`. Submit in GSC.
- **Entity consistency:** the same name, address, phone, NMLS and description on the site,
  Google Business Profile, social profiles and directories. Link them with `sameAs`.
- **Freshness:** a visible "Updated" date. Re-review pillar pages quarterly.
- **Primary-source citations:** link the official program or agency page when stating rules
  (external links in articles are fine on pillars even if the auto-blog avoids them).

## 5. Targeting: local vs national vs hybrid
Decide per topic cluster, not per site:
| Signal | Choose |
|---|---|
| Searchers add a place, or results show map packs and local businesses | **Local** |
| The answer changes by place (program availability, limits, property types, rural eligibility) | **Local layer** under a national pillar |
| The answer is the same everywhere (definitions, how a loan type works) | **National** |
| Brand or service is delivered statewide but bought locally | **Hybrid:** state pillar → county/city pages |

**Local page quality bar (avoid doorway pages).** Location pages that only swap the place name
can be treated as doorway pages and hurt the whole site. Every location page needs genuinely
local content: the county seat and cities, local market character, local offices or agencies
that matter, how the program applies there, local FAQs, and links to nearby locations through
a hub. If you can't make 67 pages genuinely different, launch the strongest locations first.

Local foundation: Google Business Profile (category, services, Q&A, posts), consistent NAP,
`LocalBusiness` schema with `areaServed`, reviews mentioning service and place.

## 6. Content types that win citations
- Pillar Q&A hubs ("Everything about X, answered")
- "Who qualifies" checklists, which are highly quotable
- Comparison tables (X vs Y)
- Step-by-step process pages (HowTo)
- Calculators and tools, which earn links
- Glossary or definition pages for jargon
- Local Q&A pages ("X in {County}: what buyers ask")
- Myth-vs-fact pages that answer common misconceptions found in Reddit and forum research

## 7. Measuring AEO
- GSC: impressions and clicks on question queries (filter queries starting with
  how/what/can/do/is/who/when/why); pages indexed; average position for target clusters.
- Monthly citation check: ask ChatGPT, Perplexity, Gemini and Google (AI Overview) the top 20
  questions. Log whether the site is cited, who is cited instead, and the passage they used.
- Leads by landing page (UTM/UMTID).
