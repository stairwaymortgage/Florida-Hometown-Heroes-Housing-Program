# Florida Hometown Heroes Housing Program — Static Site (v2.3)

Built from the **actual Elementor export** + **cross-verified against live site screenshot**. Matches the live site structurally section-by-section.

## How editing works

### 🔑 To change the HEADER on ALL pages:
Edit **`header.html`** → save → refresh any page.

### 🔑 To change the FOOTER on ALL pages:
Edit **`footer.html`** → save → refresh any page.

---

## Home page — 15 sections (matches Elementor JSON exactly)

| # | Section | Layout | Background |
|---|---------|--------|------------|
| 0 | Hero | full-width text | `Hometown-Heroes.webp` image bg + navy overlay |
| 1 | Key Takeaways Q&A | single col, 5 collapsibles | white |
| 2 | Quick Facts (9 cards) | 3-col grid | `Bg11.jpg` image bg |
| 3 | What Is | **2-col: image LEFT + text RIGHT** + full-width text below | white |
| 4 | Interest Rates | **2-col: text LEFT + `Homebuyer-key.webp` visible on RIGHT** | side-image |
| 5 | Eligibility | single col | bright blue #009CFF |
| 6 | Down Payment & Loan Limits | single col | white |
| 7 | Mortgage Insurance | single col | bright blue #009CFF |
| 8 | Debt-to-Income & Income | single col | white |
| 9 | Benefits & Features | single col | white |
| 10 | Loan Program Comparison Table | single col | white |
| 11 | How to Apply (9-step) | single col | white |
| 12 | Pros & Cons (2-col) | pros + cons grid | bright blue #009CFF |
| 13 | FAQ's | single col, 11 collapsibles | white |
| 14 | Is It Right for You | single col + CTA | white |

## Brand tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Navy | `#002868` | Logo, headings |
| Bright Blue | `#009CFF` | Top bar, footer, SEC#5/7/12 |
| Orange | `#FF6400` | Apply Now CTA |
| Sage BG | `#E8F0E7` | Section backgrounds (other pages) |
| Body | `#404040` | Text |

Fonts: **Helvetica** (headings) + **PT Sans** (body)

---

## 🖼️ Image inventory

### Home
1. **Hero bg** — `Hometown-Heroes.webp` (crowd image)
2. **Quick Facts section bg** — `Bg11.jpg`
3. **"What Is" left column** — `Awaiting-2025-Hometown-Heroes.jpeg` (inline)
4. **"Interest Rates" right side bg** — `Homebuyer-key.webp` (visible on right)

### Eligible Occupations
1. Hero bg — `Copy-of-22-UFCU-FAMILY.jpg`
2. School Staff section bg — `Homebuyer-key.webp`
3. Inline #1 after Public Safety — `Conventional-Loans-2.jpg`
4. Inline #2 after Veterans — `VA-Header-4-1.jpg`
5. Inline #3 after How to Verify — `VA-Header-4-1.jpg`
6. Inline #4 before CTA — `Conventional-Loans-2.jpg`

### Income Limits
1. Hero bg — `Copy-of-22-UFCU-FAMILY.jpg`
2. Highest Counties section bg — `Homebuyer-key.webp`
3. Between Highest Counties and TBA — `Conventional-Loans-2.jpg`
4. Between USDA and FAQs — `Conventional-Loans-2.jpg`
5. **67-county table** — exact live FHFC 2025 values

### Contact us
- Hero bg — `Copy-of-22-UFCU-FAMILY.jpg`
- 5-field form (matches live exactly)

### Schedule a Call
- Hero bg — `Copy-of-22-UFCU-FAMILY.jpg`

---

## Files

- **`header.html`** — bright blue top bar + white main header
- **`footer.html`** — bright blue 4-column footer
- **`style.css`** — all tokens + 2-col row layouts + section-bg + side-image classes
- **`includes.js`** — auto-loads header/footer
- 5 page HTMLs (index, eligible-occupations, income-limits, schedule-a-call, contact-us)
- `vercel.json` — `cleanUrls: true, trailingSlash: false`
- `sitemap.xml`, `robots.txt`, `images/README.md`

---

## Testing locally

```bash
cd fhth-v2
python3 -m http.server 8000
```

---

## v2.2 → v2.3 changelog (this version)

**Major structural fixes from live screenshot review:**

1. **Hero overlay reduced** (rgba 0.72→0.55, 0.82→0.65) so `Hometown-Heroes.webp` crowd image now shows clearly behind text.

2. **Quick Facts section bg overlay reduced** (0.88→0.78) so `Bg11.jpg` visible behind 9 cards.

3. **"What Is" section restructured** to 2-column:
   - LEFT column: `Awaiting-2025-Hometown-Heroes.jpeg` image
   - RIGHT column: heading + first paragraph
   - Below: full-width additional text
   (matches Elementor JSON SEC#3 exactly)

4. **"Interest Rates" section restructured** to side-image layout:
   - Section bg = `Homebuyer-key.webp` shown on RIGHT side
   - Text takes LEFT half
   - Right half lets image show through
   (matches Elementor JSON SEC#4 exactly)

5. **Added 4 missing sections** that were in Elementor but absent from v2.2:
   - SEC#6 Down Payment & Loan Limits (white)
   - SEC#7 Mortgage Insurance Requirements (bright blue)
   - SEC#8 Debt-to-Income Ratio & Income Requirements (white)
   - SEC#9 Benefits & Features (white)

6. **Total home page sections: 15 (matches Elementor exactly)** vs 11 in v2.2.

---

## Pre-launch checklist

1. **Formspree:** sign up → form ID → replace `YOUR_FORM_ID` in `contact-us.html`
2. **Apply Now URL** — `header.html` has `#apply` placeholder
3. **Loan Calculator URL** — `#calculator` placeholder
4. **Social links** — header has `href="#"` placeholders (FB, X, LinkedIn)
5. **Calendly / scheduler** — `schedule-a-call.html` ready to embed
6. **GA4 measurement ID**
7. **Images self-hosting** — see `images/README.md` for migration steps
8. **Remove `noindex`** when ready to launch
