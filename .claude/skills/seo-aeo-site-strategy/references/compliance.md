# Compliance rules (Stairway Mortgage / Jim Blackburn sites)

Every recommendation, title, heading, FAQ answer and sample paragraph must follow these.
Jim Blackburn is a licensed mortgage loan originator, so his content is advertising.

## Identity
- Jim Blackburn, **NMLS #1072866**: in page body, hero or trust areas (3× per page on site
  pages; 2× minimum in blog posts).
- Stairway Mortgage is a division of NEXA Mortgage LLC. NEXA's **NMLS #1660690 goes in the
  footer ONLY**, never in body copy.
- "48 states" or any licensing-scope claim belongs to NEXA, never to Jim personally; footer only.
- "Stairway Mortgage" is never translated or altered.
- Phone: (954) 993-1625.

## Never write
- Interest rates, APRs, rate percentages, or rate-adjacent promises ("lower rate/payment",
  "competitive/best/lowest rate", "favorable terms", "save on interest").
- Approval or qualification guarantees ("guaranteed", "you'll qualify", "will be approved").
  Use "may", "could", "often", "many buyers".
- The word **"better"**, in any form or context (permanently banned).
- Wholesale or partner lender names (Click n' Close, National Capital Funding/NCF, Trinity Oaks,
  UWM, etc.). Say "the lender" or "our construction partner".
- CTAs other than **"See My Options"** or **"Talk to Our Team"**. Never "Talk to Jim",
  "Apply Now", "Get a Quote".
- VA loans described as "capped".
- **VA eligibility implied for civilian heroes** (police, firefighters, EMTs/paramedics,
  teachers, corrections officers, federal law enforcement, nurses/healthcare). Only military
  and veterans are VA-eligible.
- Fabricated statistics, prices or program figures. Program amounts, limits and deadlines
  come only from the official source, fetched and dated.
- AI images of real, named public figures.
- Anything implying the site is an official government or agency site.

## Fair housing and fair lending
- No neighborhood or demographic comparisons that pair groups with financial outcomes.
- No maps contrasting areas by demographics.
- Equal Housing Opportunity disclosure in the site footer.

## Process
- Content that goes live as advertising may need NEXA compliance review. Flag new
  page types and campaigns for review.

## Blog Auto-Post compliance block (paste into site-config.js)
```js
brand: {
  business: "Stairway Mortgage",
  about: "<one or two sentences: what this site is and who it helps>",
  person: "Jim Blackburn", nmls: "1072866", nmlsMinMentions: 2,
  phone: "(954) 993-1625",
  audience: "<who reads this site>"
},
compliance: {
  mortgageRules: true,
  bannedWords: ["better"],
  bannedPhrases: ["click n' close","click n close","clicknclose","national capital funding","nexa","1660690","talk to jim","apply now","get a quote","48 states"],
  civilianNoVA: true,
  civilianKeywords: ["police","firefighter","emt","paramedic","teacher","corrections","federal law","nurse","healthcare"]
},
frontmatter: { author: "Jim Blackburn", locationField: "county", extra: { nmls: "1072866" } }
```
