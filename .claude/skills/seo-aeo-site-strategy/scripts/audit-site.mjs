#!/usr/bin/env node
// SEO + AEO site audit. No dependencies; Node 18+.
// Usage: node audit-site.mjs https://example.com [--max 500] [--out seo-strategy/audit] [--concurrency 6]
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
if (!args[0] || args[0].startsWith('--')) {
  console.error('Usage: node audit-site.mjs <site-url> [--max 500] [--out dir] [--concurrency 6]');
  process.exit(1);
}
const opt = (name, def) => { const i = args.indexOf('--' + name); return i > -1 ? args[i + 1] : def; };
const START = new URL(args[0]);
const ORIGIN = START.origin;
const MAX = parseInt(opt('max', '500'), 10);
const OUT = opt('out', 'seo-strategy/audit');
const CONC = parseInt(opt('concurrency', '6'), 10);
const UA = 'Mozilla/5.0 (compatible; SiteAuditBot/1.0; +seo-aeo-site-strategy)';
const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'Claude-Web', 'anthropic-ai', 'Google-Extended', 'CCBot', 'Applebot-Extended'];

fs.mkdirSync(OUT, { recursive: true });

async function get(url, timeout = 20000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: ctl.signal });
    const body = (r.headers.get('content-type') || '').match(/text|xml|json/) ? await r.text() : '';
    return { status: r.status, url: r.url, type: r.headers.get('content-type') || '', body };
  } catch (e) {
    return { status: 0, url, type: '', body: '', error: e.name === 'AbortError' ? 'timeout' : e.message };
  } finally { clearTimeout(t); }
}

const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const strip = s => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')); return m ? decode(m[2] ?? m[3] ?? m[4] ?? '') : null; };
const QUESTION = /\?\s*$|^(how|what|why|when|where|who|which|can|could|do|does|did|is|are|should|will|would|may)\b/i;
const normalize = (u) => { try { const x = new URL(u, ORIGIN); x.hash = ''; if (x.pathname !== '/' && !x.pathname.endsWith('/') && !/\.[a-z0-9]{2,5}$/i.test(x.pathname)) { /* keep as-is */ } return x.href; } catch { return null; } };
const isPage = (u) => !/\.(pdf|jpe?g|png|gif|webp|svg|ico|css|js|mjs|json|xml|txt|zip|mp4|mp3|webm|woff2?|ttf)(\?|$)/i.test(u);

// ---------- robots.txt ----------
const robots = await get(ORIGIN + '/robots.txt');
const robotsTxt = robots.status === 200 ? robots.body : '';
const sitemapUrls = [...robotsTxt.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map(m => m[1]);
function botBlocked(bot) {
  const groups = robotsTxt.split(/\n(?=\s*user-agent:)/i);
  for (const g of groups) {
    const agents = [...g.matchAll(/user-agent:\s*(.+)/gi)].map(m => m[1].trim().toLowerCase());
    if (agents.includes(bot.toLowerCase())) return /disallow:\s*\/\s*$/im.test(g);
  }
  return null; // not mentioned → falls under *
}
const starBlocksAll = (() => { const g = robotsTxt.split(/\n(?=\s*user-agent:)/i).find(g => /user-agent:\s*\*/i.test(g)); return g ? /disallow:\s*\/\s*$/im.test(g) : false; })();
const aiBots = Object.fromEntries(AI_BOTS.map(b => { const v = botBlocked(b); return [b, v === null ? (starBlocksAll ? 'blocked (via *)' : 'allowed') : (v ? 'BLOCKED' : 'allowed')]; }));

// ---------- sitemaps ----------
if (!sitemapUrls.length) sitemapUrls.push(ORIGIN + '/sitemap.xml', ORIGIN + '/sitemap-index.xml');
const sitemapPages = new Set();
const seenMaps = new Set();
async function readSitemap(u, depth = 0) {
  if (seenMaps.has(u) || depth > 3) return; seenMaps.add(u);
  const r = await get(u);
  if (r.status !== 200) return;
  const locs = [...r.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map(m => decode(m[1]));
  if (/<sitemapindex/i.test(r.body)) { for (const l of locs) await readSitemap(l, depth + 1); }
  else locs.forEach(l => sitemapPages.add(normalize(l)));
}
for (const s of sitemapUrls) await readSitemap(s);

// ---------- llms.txt ----------
const llms = await get(ORIGIN + '/llms.txt');
const hasLlms = llms.status === 200 && llms.body.trim().length > 0 && !/<html/i.test(llms.body);

// ---------- crawl ----------
const queue = [...new Set([normalize(START.href), normalize(ORIGIN + '/'), ...sitemapPages])].filter(Boolean);
const queued = new Set(queue);
const pages = [];
const inlinks = new Map();

function analyze(url, res) {
  const html = res.body || '';
  const head = (html.match(/<head[\s\S]*?<\/head>/i) || [''])[0];
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]);
  const meta = (k) => { const t = metas.find(m => (attr(m, 'name') || attr(m, 'property') || '').toLowerCase() === k); return t ? attr(t, 'content') : null; };
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]);
  const canonical = (() => { const t = links.find(l => (attr(l, 'rel') || '').toLowerCase() === 'canonical'); return t ? attr(t, 'href') : null; })();
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  const main = (body.match(/<main[\s\S]*?<\/main>/i) || [body])[0];
  const heads = (lvl) => [...body.matchAll(new RegExp(`<h${lvl}\\b[^>]*>([\\s\\S]*?)<\\/h${lvl}>`, 'gi'))].map(m => strip(m[1])).filter(Boolean);
  const h1 = heads(1), h2 = heads(2), h3 = heads(3);
  const sub = [...h2, ...h3];
  const qHeads = sub.filter(h => QUESTION.test(h));
  const text = strip(main);
  const words = text ? text.split(' ').length : 0;

  const types = new Set(); let ldErrors = 0; const faqQs = [];
  for (const m of html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (o) => {
        if (Array.isArray(o)) return o.forEach(walk);
        if (o && typeof o === 'object') {
          const t = o['@type']; (Array.isArray(t) ? t : t ? [t] : []).forEach(x => types.add(x));
          if (t === 'Question' && o.name) faqQs.push(o.name);
          Object.values(o).forEach(walk);
        }
      };
      walk(JSON.parse(m[1].trim()));
    } catch { ldErrors++; }
  }

  const anchors = [...body.matchAll(/<a\b[^>]*href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi)];
  const internal = new Set(), external = new Set();
  for (const a of anchors) {
    const href = decode(a[2] ?? a[3] ?? a[4] ?? '');
    if (/^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
    const abs = normalize(href); if (!abs) continue;
    if (new URL(abs).origin === ORIGIN) internal.add(abs); else external.add(abs);
  }
  const imgs = [...body.matchAll(/<img\b[^>]*>/gi)].map(m => m[0]);
  const imgNoAlt = imgs.filter(i => { const a = attr(i, 'alt'); return a === null || a.trim() === ''; }).length;
  const robotsMeta = (meta('robots') || '').toLowerCase();
  const htmlTag = (html.match(/<html\b[^>]*>/i) || [''])[0];
  const dateMod = (html.match(/"dateModified"\s*:\s*"([^"]+)"/) || [])[1] || meta('article:modified_time') || '';

  return {
    url, status: res.status, finalUrl: res.url, redirected: res.url !== url,
    title: strip((head.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || ['', ''])[1]),
    metaDescription: meta('description') || '',
    canonical: canonical || '', noindex: /noindex/.test(robotsMeta), lang: attr(htmlTag, 'lang') || '',
    ogTitle: meta('og:title') || '', ogImage: meta('og:image') || '',
    h1, h2, h3, questionHeadings: qHeads.length, subheadings: sub.length,
    questionRatio: sub.length ? +(qHeads.length / sub.length).toFixed(2) : 0,
    words, schemaTypes: [...types], ldJsonErrors: ldErrors, faqSchemaQuestions: faqQs.length,
    hasFaqSection: faqQs.length > 0 || sub.some(h => /faq|frequently asked/i.test(h)),
    internalLinks: [...internal], externalLinks: external.size, images: imgs.length, imagesMissingAlt: imgNoAlt,
    dateModified: dateMod, inSitemap: sitemapPages.has(url)
  };
}

async function worker() {
  while (queue.length && pages.length < MAX) {
    const url = queue.shift();
    const res = await get(url);
    if (!/html/i.test(res.type) && res.status === 200) continue;
    const p = analyze(url, res);
    if (res.error) p.error = res.error;
    pages.push(p);
    for (const l of p.internalLinks) {
      inlinks.set(l, (inlinks.get(l) || 0) + 1);
      if (!queued.has(l) && isPage(l) && queued.size < MAX * 2) { queued.add(l); queue.push(l); }
    }
    if (pages.length % 25 === 0) console.error(`  crawled ${pages.length}...`);
  }
}
console.error(`Auditing ${ORIGIN} (sitemap URLs: ${sitemapPages.size}, max pages: ${MAX})`);
await Promise.all(Array.from({ length: CONC }, worker));

// ---------- issues ----------
const ok = pages.filter(p => p.status === 200 && !p.noindex);
const dup = (key) => { const m = new Map(); ok.forEach(p => { const v = p[key]; if (v) m.set(v, [...(m.get(v) || []), p.url]); }); return [...m.entries()].filter(([, u]) => u.length > 1); };
const issues = [];
const add = (sev, code, msg, urls) => urls.length && issues.push({ sev, code, msg, count: urls.length, urls: urls.slice(0, 25) });
add('Critical', 'BROKEN', 'Pages not returning 200', pages.filter(p => p.status !== 200).map(p => `${p.url} (${p.status || p.error})`));
add('Critical', 'NOINDEX', 'Pages set to noindex (check intentional)', pages.filter(p => p.noindex).map(p => p.url));
add('High', 'NO_TITLE', 'Missing <title>', ok.filter(p => !p.title).map(p => p.url));
add('High', 'NO_H1', 'Missing H1', ok.filter(p => !p.h1.length).map(p => p.url));
add('Medium', 'MULTI_H1', 'More than one H1', ok.filter(p => p.h1.length > 1).map(p => p.url));
add('High', 'NO_META', 'Missing meta description', ok.filter(p => !p.metaDescription).map(p => p.url));
add('Medium', 'TITLE_LEN', 'Title outside 30–65 chars', ok.filter(p => p.title && (p.title.length < 30 || p.title.length > 65)).map(p => `${p.url} (${p.title.length})`));
add('Medium', 'META_LEN', 'Meta description outside 70–160 chars', ok.filter(p => p.metaDescription && (p.metaDescription.length < 70 || p.metaDescription.length > 160)).map(p => `${p.url} (${p.metaDescription.length})`));
dup('title').forEach(([t, u]) => add('High', 'DUP_TITLE', `Duplicate title: "${t.slice(0, 70)}"`, u));
dup('metaDescription').forEach(([t, u]) => add('Medium', 'DUP_META', `Duplicate meta description: "${t.slice(0, 70)}"`, u));
add('High', 'NO_CANONICAL', 'Missing canonical', ok.filter(p => !p.canonical).map(p => p.url));
add('Medium', 'CANONICAL_ELSEWHERE', 'Canonical points to another URL', ok.filter(p => p.canonical && normalize(p.canonical) !== p.url && normalize(p.canonical) !== p.finalUrl).map(p => `${p.url} → ${p.canonical}`));
add('High', 'THIN', 'Thin content (<300 words)', ok.filter(p => p.words < 300).map(p => `${p.url} (${p.words}w)`));
add('High', 'NO_SCHEMA', 'No JSON-LD schema at all', ok.filter(p => !p.schemaTypes.length).map(p => p.url));
add('High', 'LDJSON_ERROR', 'Invalid JSON-LD', ok.filter(p => p.ldJsonErrors).map(p => p.url));
add('High', 'FAQ_NO_SCHEMA', 'Has FAQ section/question headings but no FAQPage schema', ok.filter(p => (p.hasFaqSection || p.questionHeadings >= 3) && !p.schemaTypes.includes('FAQPage')).map(p => p.url));
add('Medium', 'LOW_QUESTION_RATIO', 'AEO: <30% of subheadings are questions (pages with 3+ subheadings)', ok.filter(p => p.subheadings >= 3 && p.questionRatio < 0.3).map(p => `${p.url} (${Math.round(p.questionRatio * 100)}%)`));
add('Medium', 'NO_DATE', 'AEO: article-like page with no dateModified', ok.filter(p => p.words > 600 && !p.dateModified && /blog|news|guide|article/i.test(p.url)).map(p => p.url));
add('Medium', 'ALT', 'Images missing alt text', ok.filter(p => p.imagesMissingAlt).map(p => `${p.url} (${p.imagesMissingAlt}/${p.images})`));
add('Medium', 'NOT_IN_SITEMAP', 'Crawlable page missing from sitemap', sitemapPages.size ? ok.filter(p => !p.inSitemap && !p.redirected).map(p => p.url) : []);
add('Medium', 'ORPHAN', 'In sitemap but no internal links found pointing to it', ok.filter(p => p.inSitemap && !inlinks.get(p.url) && p.url !== normalize(ORIGIN + '/')).map(p => p.url));
add('Medium', 'NO_OG', 'Missing og:title or og:image', ok.filter(p => !p.ogTitle || !p.ogImage).map(p => p.url));
if (!hasLlms) issues.push({ sev: 'Medium', code: 'NO_LLMS_TXT', msg: 'AEO: no /llms.txt', count: 1, urls: [ORIGIN + '/llms.txt'] });
if (!sitemapPages.size) issues.push({ sev: 'High', code: 'NO_SITEMAP', msg: 'No sitemap found (robots.txt or /sitemap.xml)', count: 1, urls: [] });
const blockedBots = Object.entries(aiBots).filter(([, v]) => /blocked/i.test(v)).map(([b]) => b);
if (blockedBots.length) issues.push({ sev: 'High', code: 'AI_BOTS_BLOCKED', msg: 'AEO: AI crawlers blocked in robots.txt (owner decision)', count: blockedBots.length, urls: blockedBots });

// ---------- outputs ----------
const csvCell = v => { const s = Array.isArray(v) ? v.join(' | ') : String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const cols = ['url', 'status', 'title', 'metaDescription', 'canonical', 'noindex', 'h1', 'h2', 'questionHeadings', 'subheadings', 'questionRatio', 'words', 'schemaTypes', 'faqSchemaQuestions', 'hasFaqSection', 'internalLinksOut', 'inlinks', 'externalLinks', 'images', 'imagesMissingAlt', 'dateModified', 'inSitemap'];
const rows = pages.map(p => ({ ...p, internalLinksOut: p.internalLinks.length, inlinks: inlinks.get(p.url) || 0 }));
fs.writeFileSync(path.join(OUT, 'pages.csv'), [cols.join(','), ...rows.map(r => cols.map(c => csvCell(r[c])).join(','))].join('\n') + '\n');

const schemaCount = {}; ok.forEach(p => p.schemaTypes.forEach(t => schemaCount[t] = (schemaCount[t] || 0) + 1));
const sections = {}; ok.forEach(p => { const s = new URL(p.url).pathname.split('/').filter(Boolean)[0] || '(home)'; sections[s] = (sections[s] || 0) + 1; });
const avg = (k) => ok.length ? Math.round(ok.reduce((a, p) => a + p[k], 0) / ok.length) : 0;
const totalSub = ok.reduce((a, p) => a + p.subheadings, 0), totalQ = ok.reduce((a, p) => a + p.questionHeadings, 0);
const summary = {
  site: ORIGIN, crawledAt: new Date().toISOString(), pagesCrawled: pages.length, indexablePages: ok.length,
  sitemapUrls: sitemapPages.size, hitMaxLimit: pages.length >= MAX, hasLlmsTxt: hasLlms, aiBots,
  avgWords: avg('words'), questionHeadingShare: totalSub ? +(totalQ / totalSub).toFixed(2) : 0,
  pagesWithFaqSchema: ok.filter(p => p.schemaTypes.includes('FAQPage')).length,
  schemaTypes: schemaCount, sections, issues
};
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));

const sevOrder = { Critical: 0, High: 1, Medium: 2 };
issues.sort((a, b) => sevOrder[a.sev] - sevOrder[b.sev] || b.count - a.count);
const md = [
  `# Site audit: ${ORIGIN}`, `Crawled ${summary.crawledAt}. ${pages.length} pages crawled (${ok.length} indexable), ${sitemapPages.size} URLs in sitemap${summary.hitMaxLimit ? ' — **hit --max limit, rerun with a higher --max for full coverage**' : ''}.`, '',
  '## AEO snapshot',
  `- Question-style subheadings: **${Math.round(summary.questionHeadingShare * 100)}%** of all H2/H3 (target 60%+)`,
  `- Pages with FAQPage schema: **${summary.pagesWithFaqSchema}** of ${ok.length}`,
  `- llms.txt: **${hasLlms ? 'present' : 'missing'}**`,
  `- Average words per page: ${summary.avgWords}`,
  `- AI crawlers: ${Object.entries(aiBots).map(([b, v]) => `${b} ${v}`).join(', ')}`, '',
  '## Schema types found', ...Object.entries(schemaCount).sort((a, b) => b[1] - a[1]).map(([t, n]) => `- ${t}: ${n} pages`), Object.keys(schemaCount).length ? '' : '- none', '',
  '## Site sections (by first URL segment)', ...Object.entries(sections).sort((a, b) => b[1] - a[1]).map(([s, n]) => `- /${s === '(home)' ? '' : s + '/'}: ${n}`), '',
  '## Issues', ...issues.map(i => `### [${i.sev}] ${i.msg} (${i.count})\n${i.urls.map(u => `- ${u}`).join('\n')}${i.count > i.urls.length ? `\n- …and ${i.count - i.urls.length} more (see pages.csv)` : ''}`)
].join('\n');
fs.writeFileSync(path.join(OUT, 'report.md'), md + '\n');
console.error(`Done. ${pages.length} pages, ${issues.length} issue types → ${OUT}/report.md`);
