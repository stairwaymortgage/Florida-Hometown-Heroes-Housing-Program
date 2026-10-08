// =====================================================================
//  Site Config for the n8n "Blog Auto-Post" workflow — Hometown Heroes.
//  Paste the body of this `const SITE = {...}` over the SITE object in the
//  workflow's "Site Config" node. Keep that node's COUNTIES constant, the
//  trailing safety-check block, and the `return [{ json: SITE }];` line.
//
//  Resolved vs. the template:
//    - github.repo  : "Florida-Hometown-Heroes-Housing-Program"  (was FILL_ME)
//    - cta.url      : "/contact-us"                               (was FILL_ME)
//    - postUrl      : "/blog/{slug}"  — this site is trailingSlash:'never'
//                      (astro.config.mjs + vercel.json), so NO trailing slash.
//    - links.allowed: the site's real hub pages (all verified to exist).
//    - topics       : pointed at real hubs (/, /eligible-occupations,
//                      /loan-calculator) and ordered by priority (P1 first).
//    - programFacts : left EMPTY on purpose — see the note on that field.
// =====================================================================
const SITE = {
  // ---------- Identity ----------
  key: "hometown-heroes",
  name: "Florida Hometown Heroes Housing Program",
  domain: "https://floridahometownheroeshousingprogram2026.com",

  // ---------- Where posts live (GitHub) ----------
  github: { owner: "stairwaymortgage", repo: "Florida-Hometown-Heroes-Housing-Program" },
  paths: {
    postsDir: "src/content/blog",                 // Astro content collection (built in this repo)
    registry: "src/data/published-niches.json",   // created in this repo with content: []
    taxonomy: ""                                  // site has no taxonomy file → that step is skipped
  },
  postUrl: "/blog/{slug}",                         // trailingSlash:'never' — no trailing slash

  // ---------- Hero images (Cloudflare R2) ----------
  media: {
    bucket: "stairway-media",
    prefix: "hometown-heroes/blog/",
    publicBase: "https://media.stairwaymortgage.com/"
  },

  // ---------- Who the post speaks for ----------
  brand: {
    business: "Stairway Mortgage",
    about: "Stairway Mortgage is a mortgage origination business in Fort Lauderdale, FL led by Jim Blackburn (NMLS #1072866). This site helps Florida frontline workers understand and use the Florida Hometown Heroes Housing Program alongside a first mortgage.",
    person: "Jim Blackburn",
    nmls: "1072866",
    nmlsMinMentions: 2,
    phone: "(954) 993-1625",
    audience: "Florida frontline and community workers (teachers, healthcare workers, law enforcement, firefighters, EMTs, corrections officers, military and veterans, and similar) buying a home in Florida"
  },

  // ---------- What to write about ----------
  // One post per topic × county. Ordered P1→P3 (see seo-strategy/keyword-clusters.csv).
  // url = the existing hub each post pushes readers to. noVA = civilian hero (no VA implied).
  topics: [
    { niche: "Hometown Heroes Down Payment Assistance Explained", question: "How does Florida Hometown Heroes down payment assistance work?", url: "/", cat: "program-guides", tags: ["hometown-heroes","down-payment-assistance"] },
    { niche: "Is Hometown Heroes a Grant or a Repayable Loan", question: "Is Florida Hometown Heroes a grant or do you pay it back?", url: "/", cat: "program-guides", tags: ["hometown-heroes","repayment"] },
    { niche: "Hometown Heroes Eligibility Checklist", question: "Who is eligible for the Florida Hometown Heroes program?", url: "/eligible-occupations", cat: "program-guides", tags: ["hometown-heroes","eligibility"] },
    { niche: "Hometown Heroes for Teachers", question: "Can teachers use the Florida Hometown Heroes program to buy a home?", url: "/eligible-occupations", cat: "heroes", tags: ["hometown-heroes","teachers"], noVA: true },
    { niche: "Hometown Heroes for Nurses and Healthcare Workers", question: "Can nurses and healthcare workers use Florida Hometown Heroes?", url: "/eligible-occupations", cat: "heroes", tags: ["hometown-heroes","healthcare"], noVA: true },
    { niche: "Hometown Heroes with an FHA Loan", question: "Can you use Florida Hometown Heroes with an FHA loan?", url: "/loan-calculator", cat: "program-guides", tags: ["hometown-heroes","fha"] },
    { niche: "Hometown Heroes with a Conventional Loan", question: "Can you use Florida Hometown Heroes with a conventional loan?", url: "/loan-calculator", cat: "program-guides", tags: ["hometown-heroes","conventional"] },
    { niche: "Hometown Heroes for Police Officers", question: "Can police officers get Florida Hometown Heroes down payment help?", url: "/eligible-occupations", cat: "heroes", tags: ["hometown-heroes","law-enforcement"], noVA: true },
    { niche: "Hometown Heroes for Firefighters", question: "How can firefighters use the Florida Hometown Heroes program?", url: "/eligible-occupations", cat: "heroes", tags: ["hometown-heroes","firefighters"], noVA: true },
    { niche: "Hometown Heroes for EMTs and Paramedics", question: "Do EMTs and paramedics qualify for Florida Hometown Heroes?", url: "/eligible-occupations", cat: "heroes", tags: ["hometown-heroes","ems"], noVA: true },
    { niche: "Hometown Heroes for Corrections Officers", question: "Can corrections officers use Florida Hometown Heroes to buy a home?", url: "/eligible-occupations", cat: "heroes", tags: ["hometown-heroes","corrections"], noVA: true },
    { niche: "Hometown Heroes for Military and Veterans", question: "Can military members and veterans combine Hometown Heroes with their home loan?", url: "/eligible-occupations", cat: "heroes", tags: ["hometown-heroes","military"] },
    { niche: "Hometown Heroes for First-Time Home Buyers", question: "How do first-time buyers use Florida Hometown Heroes?", url: "/", cat: "program-guides", tags: ["hometown-heroes","first-time-buyer"] }
  ],

  // ---------- Localization ----------
  locations: {
    list: COUNTIES,              // the 67 Florida counties constant in the Site Config node
    suffix: "County",
    state: "Florida",
    instructions: "Reference the county by name naturally 2-4 times, mention its county seat or a real city within it, and tie the guidance to that local market in general terms. Do NOT invent statistics, home prices, or county-specific program details. The title must include the county name."
  },

  // ---------- Verified program facts (the ONLY specifics the AI may state) ----------
  // Left EMPTY on purpose. The writer may only state a dollar amount, percentage,
  // income limit or deadline if it is listed here. Program details change yearly and
  // must come from the OFFICIAL source (floridahousing.org / eHousingPlus), not blogs.
  // This repo already carries verified numbers with provenance in
  // public/config/program-2026.json (each has `source` + `verified_on`) — promote a
  // line here only after confirming it is current for the 2026 cycle, e.g.:
  //   "DPA is 5% of the first mortgage, min $10,000, max $35,000 — floridahousing.org, checked 2026-10-07"
  // Until then the AI writes in general terms (the template's default, which is safest).
  programFacts: [],

  // ---------- Internal links + CTA ----------
  links: {
    allowed: ["/", "/eligible-occupations", "/income-limits", "/loan-calculator", "/florida-county-housing-programs", "/blog"],
    labels: {
      "/": "the Hometown Heroes program overview",
      "/eligible-occupations": "the eligible occupations list",
      "/income-limits": "the county income limits",
      "/loan-calculator": "the assistance calculator",
      "/florida-county-housing-programs": "your county housing program",
      "/blog": "more Hometown Heroes guides"
    },
    min: 2, max: 6
  },
  cta: { phrases: ["See My Options", "Talk to Our Team"], url: "/contact-us" },

  // ---------- Writing ----------
  writing: {
    wordMin: 1100, wordMax: 1500,
    hardMin: 700,
    aeo: true,
    voice: "Second person, plain, warm. No hype, no exclamation marks. Open with a concrete situation this audience faces. No \"In today's market\" openings. 4-6 H2 sections (##). Short paragraphs.",
    extraRules: [
      "Never present this site as the official State of Florida or Florida Housing Finance Corporation website. Refer to the program as a state program that Stairway Mortgage helps buyers use.",
      "Never state program dollar amounts, percentages, income limits, or deadlines unless they appear in VERIFIED PROGRAM FACTS.",
      "Always describe the assistance as a repayable 0% deferred second mortgage, never a grant or free money."
    ]
  },

  // ---------- Compliance gate (from references/compliance.md) ----------
  compliance: {
    mortgageRules: true,
    bannedWords: ["better"],
    bannedPhrases: ["click n' close","click n close","clicknclose","national capital funding","nexa","1660690","talk to jim","apply now","get a quote","48 states"],
    civilianNoVA: true,
    civilianKeywords: ["police","firefighter","emt","paramedic","teacher","corrections","federal law","nurse","healthcare"]
  },

  // ---------- Trend headlines (Google News RSS) ----------
  trends: {
    queries: {
      "Teacher": "Florida teacher pay OR teacher housing",
      "Nurse": "Florida nurse pay OR healthcare workers housing",
      "Police": "Florida police officer pay OR law enforcement recruitment",
      "Firefighter": "Florida firefighter pay OR fire department staffing",
      "EMT": "EMT paramedic pay OR EMS staffing Florida",
      "Corrections": "Florida corrections officer pay OR staffing",
      "Military": "military BAH OR veteran home buying Florida",
      "FHA": "FHA loan first time buyer",
      "Conventional": "first time home buyer down payment"
    },
    defaultQuery: "Florida Hometown Heroes housing program OR Florida down payment assistance",
    blockWords: []
  },

  // ---------- Post file ----------
  frontmatter: {
    author: "Jim Blackburn",
    locationField: "county",
    extra: { nmls: "1072866" }
  },

  // ---------- Hero image ----------
  image: {
    style: "STRICT: Photorealistic documentary photograph of a real human being. Absolutely no text, letters, numbers, words, signage, logos, watermarks, charts, graphs, screens showing text, papers with legible writing, name tags, or badges. Natural lighting, candid, unposed. 50mm lens, shallow depth of field. No illustration, no 3D render, no cartoon."
  }
};
