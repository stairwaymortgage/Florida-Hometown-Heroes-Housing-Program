# 02 — Targeting model

## Decision: **Hybrid (national question pillars + a 67-county local layer)**

The program is a **statewide** benefit delivered **locally** (income limits, purchase-price
caps and local SHIP programs vary by county), and real searchers and competitors use county
names. So the site should answer the national "what is it / who qualifies" questions once, in
depth, and then localize the same questions to each county.

### Why hybrid, not pure national or pure local
- **Local signal is real.** A direct competitor, `movewithmomentum.com`, already publishes
  deep `/down-payment-assistance/{county}` pages, and searchers query "{county} Hometown Heroes
  income limit" and "down payment assistance {county}". Program numbers genuinely differ by
  county (income limits, purchase-price caps, USDA eligibility), so a local layer is not thin —
  it carries distinct facts.
- **National pillars anchor it.** "How does Hometown Heroes work?", "Is it a grant?",
  "Who qualifies?", "Can I use it with an FHA loan?" have the same answer statewide. These are
  pillar/hub pages the local pages link up to.

## Geographic grain: **County** (all 67)
- County is the grain Florida Housing itself uses (income and purchase-price limits are
  published per county) and the grain competitors and searchers use.
- City grain would be thinner (no official per-city program figures) and would fabricate
  specificity the program doesn't have — against compliance. Reference a county's seat/cities
  *inside* the county page for relevance, but keep the page/URL at county grain.
- This matches the existing `/{county}-county-housing-program` pages and the 67-county list
  already in `src/data/counties.json`.

## Conversion
- Primary lead: **`/contact-us`** (the lead form; `FHTH.postLead` pipeline). This is the
  `cta.url` in `site-config.js`, and CTAs are "See My Options" / "Talk to Our Team".
- Secondary: **`/schedule-a-call`** (booking — Calendly embed still to be built), and the
  **`/loan-calculator`** as a soft-conversion / link-earning asset.

## How the blog fits
The blog is the **spoke layer** that feeds the pillars and the county pages: profession-×-county
and loan-type-×-county questions that are too specific for a hub page but real queries. Each post
links **up** to a pillar/hub (`/`, `/eligible-occupations`, `/loan-calculator`) and the matching
county page, never sideways into thin territory.
