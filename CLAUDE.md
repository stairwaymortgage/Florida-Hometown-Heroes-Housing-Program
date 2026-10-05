# CLAUDE.md — floridahometownheroeshousingprogram2026.com

## Project context

Static marketing + lead-gen site for the Florida Hometown Heroes Housing Program.
Deployed on **Vercel** (`vercel.json`: `cleanUrls: true`, `trailingSlash: false`, plus
security headers). No build step, no framework, no `package.json`. Plain HTML/CSS/JS.

**Editorial angle — do not dilute this.** The site's entire differentiator is that
Hometown Heroes is a *repayable deferred second mortgage*, NOT a forgivable grant.
Never label the assistance a "grant" or "free money" anywhere in copy or calculator output.

---

## Repo structure

Astro 5 static site (migrated from plain HTML, Oct 2026). Output URLs are unchanged:
`build.format: 'file'` emits `contact-us.html` etc. and Vercel `cleanUrls` serves `/contact-us`.

```
src/pages/*.astro           one per route; each imports its raw HTML fragments
src/raw/<page>/head.html    page <title>, meta, canonical (verbatim from the old HTML)
src/raw/<page>/main.html    page body between header and footer (verbatim)
src/raw/<page>/tail.html    page scripts after the footer (verbatim)
src/raw/header.html         header partial — rendered at BUILD time (was runtime includes.js)
src/raw/footer.html         footer partial — rendered at build time
src/layouts/Base.astro      shell: head + header + main + footer + tail; nav-active highlight
public/style.css            single stylesheet, token-based
public/js/lead.js           FHTH.postLead() + attribution capture
public/js/form-validate.js  FHTH.enhanceForm() — generic, form-agnostic
public/js/calculator.js     pure DPA math, no DOM, config-injected
public/js/calculator-ui.js  calculator DOM wiring
public/config/program-2026.json  all program constants (also the data source for county pages)
api/lead.js                 Vercel serverless function (stays at repo root, CommonJS)
test/calculator.test.js     npm test
```

Build: `npm install && npm run build` → `dist/`. Sitemap is generated (`sitemap-index.xml`).
Do not add `"type": "module"` to package.json — `api/lead.js` and the tests are CommonJS.
Deploy branch is `main`.

**Script load order matters.** `lead.js` → `form-validate.js` → page init.
Plain `<script>` before `</body>`, no defer.

---

## Design tokens & accessibility baseline

All colours live as CSS custom properties at `:root` in `style.css`. **Never hardcode a
hex outside `:root`.**

| Token | Value | Use |
|---|---|---|
| `--navy` | `#002868` | hero backgrounds, headings, table thead |
| `--blue` | `#009CFF` | decorative only — fails contrast as a text bg |
| `--blue-deep` | `#0A70B8` | footer bg, body links (5.22:1 on white) |
| `--surface-tint` | `#EAF4FF` | `.section-blue` band background |
| `--orange` | `#FF6400` | non-text: borders, icons, decorative |
| `--orange-text` | `#B34700` | any orange **text** (5.50:1 on white) |
| `--text` / `--text-body` | `#282828` / `#404040` | body copy |
| `--text-inverse` | `#FFFFFF` | text on navy / blue-deep |
| `--error` / `--success` | `#B00020` / `#1B7F3B` | form states |

**Rules already enforced — don't regress them:**
- Every text/background pair must hit **WCAG AA 4.5:1**. Print ratios when changing colours.
- Button *labels* are text → 1.4.3 (4.5:1). Only fills/borders fall under 1.4.11 (3:1).
- `:focus-visible` rings everywhere — a shape, never colour-only.
- `.hero.hero-*` is navy + white at 13.9:1. **Do not touch.**
- Logotypes are exempt from contrast rules. Leave `.site-logo` alone.

---

## Program facts — 2026 cycle

- **Round opened 13 July 2026** with **$50 million**, first-come first-served through
  Florida Housing–approved lenders.
- Prior rounds ran out fast: 2023 ($100M) ~3 weeks, 2024 ~5 weeks, Aug 2025 ($50M) fully
  committed in 6 months (~3,000 families).
- DPA = **5% of the first mortgage amount**, **min $10,000**, **max $35,000**.
- 0% interest, non-amortizing second mortgage. **$0/month, $0 toward DTI.**
- Repaid in full on sale, refinance, first-mortgage payoff, or occupancy change. Never forgiven.
- No 1% origination fee; doc stamp + intangible tax exemptions at closing.
- Benchmark from the last cycle: average first mortgage ~$320,000 → ~$16,000 assistance.
- **2026 income limits were revised upward.** Any 2025 figures still in page copy are stale
  and will cause visitors to wrongly self-disqualify.

---

## Data freshness rule

Every number in `config/program-2026.json` carries `source` and `verified_on`.
Anything unverified goes in the `_provenance` block and must be surfaced in the UI as
"pending verification" — never rendered as if confirmed.

**Still empty and blocking eligibility gates:**
- `county_income_limits` — needs the 2026 table from Florida Housing / eHousingPlus
- `purchase_price_caps` — same
- `mi_rates` — currently representative 2025 values, flagged unverified

Pull these from FHFC / eHousingPlus directly. Not from blogs.

---

## Calculator Spec

Lives at `#calculator` in `index.html`. Math is in `js/calculator.js` (pure, no DOM),
UI wiring in `js/calculator-ui.js`.

### The DPA rule (this is the one that gets built wrong)

```
baseDownPayment = purchasePrice × loan_types[type].min_down_pct
firstMortgage   = purchasePrice − baseDownPayment
rawDPA          = firstMortgage × 0.05          ← 5% of the FIRST MORTGAGE, not the price
dpa             = floor(clamp(rawDPA, 10000, 35000))
```

Intermediate math at full precision. **Floor — never round up.** Overstating assistance by
even a dollar creates an expectation the lender has to walk back.

### Canonical test cases

| # | Input | First mortgage | Expected DPA | Why |
|---|---|---|---|---|
| 1 | $300,000 FHA (3.5%) | $289,500 | **$14,475** | mid-band |
| 2 | $150,000 FHA | $144,750 | **$10,000** | 5% = $7,237.50 → floors to min |
| 3 | $800,000 conv (3%) | $776,000 | **$35,000** | 5% = $38,800 → caps at max |
| 4 | $320,000 VA (0%) | $320,000 | **$16,000** | matches real program average |
| 5 | income above county limit | — | calc renders, **gate fails** | pending until table filled |
| 6 | credit < 640 | — | calc renders, **gate fails** | never block the calc |
| 7 | $310,000 FHA | $299,150 | **$14,957** | floor test — rounding gives 14,958 |

### Full estimate scope

- Monthly P&I on the first mortgage (360 months)
- Upfront MI **financed into the loan by default** (FHA UFMIP, VA funding fee, USDA
  guarantee fee), with a toggle to pay cash instead
- Monthly MI by loan type — VA = 0
- Taxes, insurance, HOA → total PITI
- DTI front/back. **The DPA second mortgage contributes $0/month and $0 to DTI — say so
  explicitly in the output.**
- Eligibility checklist: pass / fail / **pending** (when a config table is empty)
- Payback comparison panel: HTH always costs the full DPA at sale; a county forgivable
  grant costs $0 after its forgiveness year
- Estimate-only disclaimer, plus a note that funding is first-come, first-served

### Open question — needs a lender to answer

`dpa.basis_includes_financed_mi` (currently `false`, flagged UNVERIFIED): when upfront MI
is financed, the loan amount rises — is the 5% calculated on the base loan or the financed
loan? This changes the DPA figure. Confirm with a Florida Housing–approved lender. Until
then, compute off the base loan and surface a note that the lender confirms the final
figure at reservation.

### UX

Show the estimate **before** asking for contact details. Gating the numbers contradicts the
site's own transparency positioning, and funding is time-limited — bounce rate matters more
than a marginal capture rate. Put a strong CTA *below* the result instead.

---

## Lead pipeline

Every form on the site routes through the same two functions. Never add a second network path.

- `FHTH.enhanceForm(formOrId, {...})` — validation, aria, loading state, honeypot
- `FHTH.postLead(payload)` — the single network chokepoint
- `FHTH.captureAttribution()` — reads UTMs + gclid on first page load, persists to
  sessionStorage as **first-touch** so attribution survives navigation before conversion

### Payload — identical shape from every form

```json
{
  "source": "contact" | "calculator" | "schedule",
  "page_url": "https://...",
  "submitted_at": "ISO-8601",
  "contact":    { "first_name": "", "last_name": "", "email": "", "phone": "" },
  "profile":    { "occupation": "", "county": "", "timeline": "" },
  "calculator": null,
  "consent":    { "tcpa": true, "text": "<verbatim string shown to the user>" },
  "meta":       { "utm_source": "", "utm_medium": "", "utm_campaign": "",
                  "gclid": "", "referrer": "", "src": "" }
}
```

`calculator` is `null` for non-calculator forms; otherwise it carries
`purchase_price, loan_type, estimated_assistance, estimated_monthly, cash_to_close, dti, eligible`.

`consent.text` stores the **literal consent string from the DOM**, not a boolean alone.
TCPA requires the verbatim wording plus timestamp. Have a compliance-aware human review
the wording before launch — this is not legal advice.

---

## Not built yet

1. **`/api/lead` serverless function** — `api/` folder doesn't exist. `postLead()` is still
   a stub that console.logs. Vercel picks up `/api` with zero config; Node 18+ has native
   `fetch`, so no dependencies needed.
2. **GHL wiring** — needs manual setup first: create custom fields for every payload key,
   then Automation → Workflows → Trigger: Inbound Webhook → copy URL into `GHL_WEBHOOK_URL`
   env var. Never call GHL directly from the browser (CORS, exposed URL, no spam filtering).
   Handler needs: honeypot check, 5 req/min per IP, server-side validation, 8s timeout with
   1 retry, real error surfaced to the user on failure, no PII in production logs.
3. **Calendly embed** on `schedule-a-call.html` — placeholder note at ~line 45. Keep it a
   booking widget; don't duplicate the contact form there.
4. **Stale 2025 copy** — homepage still cites the Aug 2025 funding round as current;
   `income-limits.html` still shows 2025 tables.

---

## Working agreement

- Audit and plan first, implement after approval. No drive-by refactors.
- One concern per commit.
- Show the pure math module before the UI when numbers are involved.
- Don't edit copy unless asked — the long-form SEO structure is deliberate.
- Any new dollar figure → `config/program-2026.json` with a source.
- Print contrast ratios for every colour change.
- Flag assumptions instead of silently guessing.