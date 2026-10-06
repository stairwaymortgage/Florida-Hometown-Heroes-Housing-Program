// Daily county news refresh for the 67 county housing program pages.
// Runs in GitHub Actions (see .github/workflows/county-news.yml). No deps.
// For each county: query Google News RSS for local housing / homebuyer news,
// keep relevant items, merge with what we already have, write
// src/data/county-news.json. Titles + links only — no AI summaries, so nothing
// can be invented. A failed fetch keeps that county's existing items.
import { readFileSync, writeFileSync } from 'node:fs';

const COUNTIES = JSON.parse(readFileSync(new URL('../src/data/counties.json', import.meta.url)));
const OUT = new URL('../src/data/county-news.json', import.meta.url);

const MAX_ITEMS = 6;           // stored per county (page shows 4)
const MAX_AGE_DAYS = 60;
const DELAY_MS = 1200;         // be gentle with Google News

const TOPIC = '("Hometown Heroes" OR housing OR "home buyers" OR homebuyers OR "down payment" OR "affordable housing" OR "home prices" OR mortgage)';
const RELEVANT = /hometown heroes|housing|home ?buyer|homebuyer|down payment|affordab|home price|home sale|mortgage|first-time|rent|real estate|apartment|homeowner|property tax|insurance|teacher|nurse|first responder|deputy|firefighter|workforce/i;
const BLOCK_SOURCES = /stock titan|sec\.gov|tradingview|business wire|globe ?newswire|pr ?newswire|streetinsider|msn/i;
const BLOCK_WORDS = /obituar|arrest|shooting|murder|crash|lawsuit|indicted|sentenced|crypto|stock|earnings call|q[1-4] (results|earnings)/i;

const decode = (s) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();

export function parseRss(xml) {
  const items = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const b = m[1];
    const get = (tag) => { const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(b); return r ? decode(r[1]) : ''; };
    let title = get('title');
    const source = get('source');
    if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
    const d = new Date(get('pubDate'));
    items.push({ title, url: get('link'), source, date: isNaN(d) ? '' : d.toISOString().slice(0, 10) });
  }
  return items;
}

export function keep(item, county) {
  if (!item.title || !item.url || item.title.length < 25) return false;
  if (BLOCK_SOURCES.test(item.source) || BLOCK_WORDS.test(item.title)) return false;
  if (!RELEVANT.test(item.title)) return false;
  // Must be about this county: county name, seat or one of its cities in the headline.
  const local = [county.name, county.seat, ...county.cities].filter(Boolean);
  const t = item.title.toLowerCase();
  return local.some((p) => t.includes(p.toLowerCase()));
}

export function merge(oldItems, newItems, now = Date.now()) {
  const cutoff = now - MAX_AGE_DAYS * 864e5;
  const seen = new Set(); const out = [];
  for (const it of [...newItems, ...oldItems]) {
    const key = it.title.toLowerCase().replace(/\W+/g, ' ').trim();
    if (seen.has(key)) continue;
    if (it.date && Date.parse(it.date) < cutoff) continue;
    seen.add(key); out.push(it);
  }
  return out.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, MAX_ITEMS);
}

async function fetchCounty(county) {
  const q = `"${county.name} County" ${TOPIC} when:30d`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (county-news bot)' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return parseRss(await res.text()).filter((it) => keep(it, county));
}

async function main() {
  const existing = JSON.parse(readFileSync(OUT));
  const today = new Date().toISOString().slice(0, 10);
  const out = {}; let changed = 0, failed = 0;
  for (const c of COUNTIES) {
    const prev = existing[c.name] || { items: [], updated: null };
    try {
      const fresh = await fetchCounty(c);
      const items = merge(prev.items || [], fresh);
      const isNew = JSON.stringify(items) !== JSON.stringify(prev.items);
      out[c.name] = { items, updated: isNew ? today : prev.updated };
      if (isNew) changed++;
    } catch (e) {
      failed++; out[c.name] = prev;
      console.warn(`${c.name}: fetch failed (${e.message}); kept existing items`);
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
  if (failed === COUNTIES.length) { console.error('All fetches failed; nothing written.'); process.exit(1); }
  writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  console.log(`county news: ${changed} counties updated, ${failed} fetch failures`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
