# 05 — Topic architecture (hub & spoke)

```
PILLAR  /  (Home) — "What is Florida Hometown Heroes and who qualifies?"
│   the money page; every spoke links up here
│
├── HUB  /eligible-occupations — "Who qualifies? Which jobs are eligible?"
│     ├── spoke(blog)  Hometown Heroes for Teachers in {county}
│     ├── spoke(blog)  Hometown Heroes for Nurses & Healthcare Workers in {county}
│     ├── spoke(blog)  Hometown Heroes for Police Officers in {county}
│     ├── spoke(blog)  Hometown Heroes for Firefighters in {county}
│     ├── spoke(blog)  Hometown Heroes for EMTs & Paramedics in {county}
│     ├── spoke(blog)  Hometown Heroes for Corrections Officers in {county}
│     └── spoke(blog)  Hometown Heroes for Military & Veterans in {county}   (VA allowed here)
│
├── HUB  /income-limits — "How much can I earn and still qualify?"
│     └── (local layer answers the per-county version)
│
├── HUB  /loan-calculator — "How much assistance could I get?"  (link-earning asset)
│     ├── spoke(blog)  Using Hometown Heroes with an FHA loan in {county}
│     └── spoke(blog)  Using Hometown Heroes with a Conventional loan in {county}
│
├── HUB  /florida-county-housing-programs  — local layer index
│     └── LOCAL  /{county}-county-housing-program  × 67
│             answers the local version of every pillar question;
│             links up to / and across only through the hub
│
└── HUB  /blog  — spoke index (the n8n auto-poster writes here)
      └── POST  /blog/{slug}   (profession-×-county, loan-type-×-county, program guides)
```

## Rules baked into `site-config.js`
- **One intent per URL.** County pages own "{county} housing program". Blog posts own the
  *sub-questions* (profession-in-county, loan-type-in-county) and link to the county page, so
  they don't cannibalize it.
- Every blog `topic.url` points at a page that **exists today**: `/`, `/eligible-occupations`,
  or `/loan-calculator`.
- Internal links in posts come only from `links.allowed` (all real hubs).
- Civilian-profession topics carry `noVA: true` (compliance: civilians are not VA-eligible).

## "Create" list (not required for the blog to run, but recommended — see roadmap)
- `public/llms.txt` — AEO crawler guide.
- FAQ blocks + FAQPage schema on `/eligible-occupations`, `/income-limits`, `/loan-calculator`
  (content mostly exists; needs the schema + question headings — see `06-page-fixes.md`).
- A pillar FAQ answering "Is it a grant?" and "Can I combine it with my county program?" on `/`.
