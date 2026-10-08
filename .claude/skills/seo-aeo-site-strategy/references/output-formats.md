# Output formats

All files go in `seo-strategy/` at the repo root.

| File | What |
|---|---|
| `00-STRATEGY.md` | The report Jim reads (Phase 7) |
| `01-site-audit.md` | Audit findings + technical fixes |
| `02-targeting.md` | Local / national / hybrid decision + geographic grain |
| `03-competitors.md` | Competitor table + gap list |
| `05-architecture.md` | Pillar → spoke → local tree |
| `06-page-fixes.md` | Exact rewrites for existing pages |
| `question-bank.csv` | Every question/keyword researched |
| `keyword-clusters.csv` | Questions grouped into one-page clusters |
| `keyword-map.csv` | One row per URL: what it targets and how |
| `site-config.js` | Drop-in `SITE` object for the n8n Blog Auto-Post |
| `audit/` | Raw crawl output from `scripts/audit-site.mjs` |
| `inputs/` | Any GSC / Ahrefs / Semrush exports the user provided |

## question-bank.csv
```
question,intent,funnel,audience,location,volume,volume_source,difficulty,serp_features,aeo_likelihood,cluster_id,current_url,current_position,source
```
- `intent`: informational | commercial | transactional | local | navigational
- `funnel`: awareness | consideration | decision
- `volume`: a number if from a tool, otherwise H/M/L. `volume_source`: gsc | ahrefs | semrush | estimated
- `aeo_likelihood`: H/M/L, how likely answer engines are to answer this directly
- `source`: paa | gsc | ahrefs | semrush | reddit | competitor:{domain} | modifier

## keyword-clusters.csv
```
cluster_id,primary_question,supporting_questions,intent,target_url,page_type,priority,notes
```
- `supporting_questions`: pipe-separated
- `page_type`: pillar | hub | audience | article | local | tool | faq
- `priority`: P1 (quick win / high value) | P2 | P3

## keyword-map.csv
```
url,action,cluster_id,primary_question,secondary_questions,title_tag,h1,meta_description,h2_questions,answer_first,faq_questions,schema,links_in,links_out,notes
```
- `action`: keep | rewrite | merge→{url} | create | redirect→{url}
- `h2_questions`, `faq_questions`, `links_in`, `links_out`: pipe-separated
- `answer_first`: the 40–60 word answer block, already compliant
- Title 50–60 chars; meta 140–155 chars

## site-config.js (n8n Blog Auto-Post → Site Config node)
Output a complete `const SITE = { ... };` object with exactly these keys. Keep the
structure; change the values. (The node's safety check and `return` lines stay as they are.)
```js
const SITE = {
  key: "short-site-id",
  name: "Site display name",
  domain: "https://canonical-domain.com",
  github: { owner: "stairwaymortgage", repo: "repo-name" },
  paths: { postsDir: "src/content/blog", registry: "src/data/published-niches.json", taxonomy: "" },
  postUrl: "/blog/{slug}/",
  media: { bucket: "stairway-media", prefix: "site-id/blog/", publicBase: "https://media.stairwaymortgage.com/" },
  brand: { business, about, person, nmls, nmlsMinMentions, phone, audience },
  topics: [
    // one per blog-worthy cluster, highest priority first
    { niche: "Short name", question: "The primary question the post answers?",
      url: "/existing-hub-page/", cat: "category-slug", tags: ["tag"], noVA: true /* civilians */,
      trendQuery: "optional google news query" }
  ],
  locations: { list: [...], suffix: "County", state: "Florida", instructions: "..." },
  programFacts: [ "Verified fact — source URL, checked YYYY-MM-DD" ],
  links: { allowed: ["/real-hub/"], labels: { "/real-hub/": "anchor text" }, min: 2, max: 6 },
  cta: { phrases: ["See My Options", "Talk to Our Team"], url: "/lead-form-page/" },
  writing: { wordMin: 1100, wordMax: 1500, hardMin: 700, aeo: true, voice: "...", extraRules: [] },
  compliance: { mortgageRules: true, bannedWords: [...], bannedPhrases: [...], civilianNoVA: true, civilianKeywords: [...] },
  trends: { queries: { "Keyword": "news query" }, defaultQuery: "...", blockWords: [] },
  frontmatter: { author: "Jim Blackburn", locationField: "county", extra: { nmls: "1072866" } },
  image: { style: "..." }
};
```
Rules:
- Every `url` in `topics` and `links.allowed` must exist on the site (check the audit), or be
  in the "create" list and built **before** the blog goes live.
- `locations.list` = `["Nationwide"]` with `suffix: ""` for non-local sites.
- Total posts = topics × locations. Report it alongside a suggested frequency.
- Copy `compliance`, `brand` and `frontmatter` values from `references/compliance.md`
  unless the site is not mortgage-related.
