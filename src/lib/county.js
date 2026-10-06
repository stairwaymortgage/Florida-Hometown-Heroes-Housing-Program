// Data + copy helpers for the 67 "[County] County Housing Program" pages.
// Every number comes from public/config/program-2026.json (FHFC lender guides)
// or src/data/counties.json (researched county records). Nothing is invented
// per county: variation comes from real data and rotating phrasings.
import counties from '../data/counties.json';
import news from '../data/county-news.json';
import config from '../../public/config/program-2026.json';

export const SITE = 'https://floridahometownheroeshousingprogram2026.com';
export const STAIRWAY = 'https://www.stairwaymortgage.com';
export const SHIP_URL =
  'https://www.floridahousing.org/programs/special-programs/ship---state-housing-initiatives-partnership-program/local-government-information';
export const NMLS = 'NMLS #1072866';

export const pageSlug = (c) => `${c.slug}-housing-program`; // broward-county-housing-program
export const usd = (n) => '$' + Number(n).toLocaleString('en-US');

// Deterministic pick so each county keeps the same wording on every build.
function hash(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
export const pick = (county, key, options) => options[hash(county.name + '|' + key) % options.length];

const incomeAll = counties.map((c) => config.income_limits_tba[c.name].fha_va_hfa);

export function countyFacts(c) {
  const inc = config.income_limits_tba[c.name];
  const loan = config.max_loan_limits[c.name];
  const above = incomeAll.filter((v) => v < inc.fha_va_hfa).length;
  const tied = incomeAll.filter((v) => v === inc.fha_va_hfa).length;
  const rank = incomeAll.filter((v) => v > inc.fha_va_hfa).length + 1;
  // First mortgage at which assistance hits the $35,000 cap, and the floor point.
  const capAt = config.dpa.max / config.dpa.pct;   // 700,000
  const floorAt = config.dpa.min / config.dpa.pct; // 200,000
  return {
    income: inc.fha_va_hfa,
    usdaIncome: inc.usda,
    fhaLimit: loan.fha,
    hfaLimit: loan.hfa_va,
    rank, tied, above,
    capReachable: loan.hfa_va >= capAt,
    // Assistance on an FHA loan at this county's FHA maximum (floored, capped).
    dpaAtFhaMax: Math.floor(Math.min(config.dpa.max, Math.max(config.dpa.min, loan.fha * config.dpa.pct))),
    // Other counties with the identical income limit (for cross-links).
    peers: counties.filter((o) => o.name !== c.name && config.income_limits_tba[o.name].fha_va_hfa === inc.fha_va_hfa),
    capAt, floorAt,
    effective: config._limits_provenance.income_limits_effective,
    loanEffective: config._limits_provenance.loan_limits_effective,
  };
}

export function countyNews(c, max = 4) {
  const entry = news[c.name];
  if (!entry) return { items: [], updated: null };
  const items = [...entry.items]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, max);
  return { items, updated: entry.updated };
}

// Stairway Mortgage program pages for Hometown Heroes–eligible occupations.
// Only occupations the FHFC program actually covers are linked here.
export const OCCUPATION_LINKS = [
  { group: 'Healthcare', label: 'physicians and doctors', href: `${STAIRWAY}/medical-professionals/physician/` },
  { group: 'Healthcare', label: 'nurses and medical professionals', href: `${STAIRWAY}/medical-professionals/` },
  { group: 'Public safety', label: 'corrections officers', href: `${STAIRWAY}/american-heroes/corrections-officers/` },
  { group: 'Public safety', label: 'police officers', href: `${STAIRWAY}/american-heroes/police-officers/` },
  { group: 'First responders', label: 'firefighters', href: `${STAIRWAY}/american-heroes/firefighters/` },
  { group: 'First responders', label: 'EMTs and paramedics', href: `${STAIRWAY}/american-heroes/emt-paramedics/` },
  { group: 'Education', label: 'teachers and school staff', href: `${STAIRWAY}/american-heroes/teachers/` },
  { group: 'Military', label: 'active-duty military and veterans', href: `${STAIRWAY}/american-heroes/` },
];

export { counties, config };
