// node test/county-news.test.mjs — checks the county news parser/filter/merge.
import assert from 'node:assert';
import { parseRss, keep, merge } from '../scripts/update-county-news.mjs';

const rss = `<?xml version="1.0"?><rss><channel>
<item><title>Broward County expands down payment help for teachers - Sun Sentinel</title><link>https://news.google.com/a1</link><pubDate>Mon, 05 Oct 2026 12:00:00 GMT</pubDate><source url="https://sun-sentinel.com">Sun Sentinel</source></item>
<item><title>Fort Lauderdale home prices dip as inventory climbs - WLRN</title><link>https://news.google.com/a2</link><pubDate>Sun, 04 Oct 2026 12:00:00 GMT</pubDate><source url="https://wlrn.org">WLRN</source></item>
<item><title>Broward deputy arrested after crash on I-95 - Local10</title><link>https://news.google.com/a3</link><pubDate>Sun, 04 Oct 2026 12:00:00 GMT</pubDate><source url="https://local10.com">Local10</source></item>
<item><title>Orlando housing market update for October buyers - WESH</title><link>https://news.google.com/a4</link><pubDate>Sun, 04 Oct 2026 12:00:00 GMT</pubDate><source url="https://wesh.com">WESH</source></item>
<item><title><![CDATA[Hometown Heroes funds &amp; Broward County first-time buyers]]> - Stock Titan</title><link>https://news.google.com/a5</link><pubDate>Sat, 03 Oct 2026 12:00:00 GMT</pubDate><source url="https://stocktitan.net">Stock Titan</source></item>
</channel></rss>`;

const broward = { name: 'Broward', seat: 'Fort Lauderdale', cities: ['Coral Springs', 'Hollywood'] };
const items = parseRss(rss);
assert.strictEqual(items.length, 5);
assert.strictEqual(items[0].title, 'Broward County expands down payment help for teachers');
assert.strictEqual(items[0].source, 'Sun Sentinel');
assert.strictEqual(items[0].date, '2026-10-05');
const kept = items.filter((i) => keep(i, broward)).map((i) => i.url);
assert.deepStrictEqual(kept, ['https://news.google.com/a1', 'https://news.google.com/a2'],
  'keeps local housing news; drops crime, other-county and blocked sources');

const now = Date.parse('2026-10-06');
const old = [
  { title: 'Broward County expands down payment help for teachers', url: 'x', source: 'S', date: '2026-10-05' }, // dup
  { title: 'Very old Broward housing story from the spring', url: 'y', source: 'S', date: '2026-06-01' },     // too old
  { title: 'Hollywood affordable housing project breaks ground', url: 'z', source: 'S', date: '2026-09-20' },
];
const m = merge(old, items.filter((i) => keep(i, broward)), now);
assert.deepStrictEqual(m.map((i) => i.date), ['2026-10-05', '2026-10-04', '2026-09-20'], 'dedupes, drops >60d, newest first');
console.log('county news tests passed');
