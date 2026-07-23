/* ============================================================
   api/lead.js — Vercel serverless (Node runtime), no dependencies.
   Receives the nested lead payload from js/form-validate.js, validates it,
   enriches it with server-side TCPA evidence (IP + timestamp + UA), and
   forwards it to GHL. A lead is NEVER silently lost: if the webhook is
   unset or the forward fails, the full payload is logged at error level
   (recoverable from Vercel logs).
   ============================================================ */
'use strict';

var WINDOW_MS = 60 * 1000;
var MAX_PER_WINDOW = 5;
var FORWARD_TIMEOUT_MS = 8 * 1000;

// In-memory, best-effort rate limit (per warm instance). ip -> [timestamps]
var hits = new Map();

function rateLimited(ip) {
  var now = Date.now();
  var arr = (hits.get(ip) || []).filter(function (t) { return now - t < WINDOW_MS; });
  if (arr.length >= MAX_PER_WINDOW) { hits.set(ip, arr); return true; }
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) { // opportunistic cleanup of cold IPs
    hits.forEach(function (v, k) {
      if (!v.some(function (t) { return now - t < WINDOW_MS; })) hits.delete(k);
    });
  }
  return false;
}

function clientIp(req) {
  var xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'unknown';
}

function isStr(v) { return typeof v === 'string' && v.trim() !== ''; }

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;        // Vercel pre-parsed
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return null; } }
  var chunks = [];
  for await (var c of req) chunks.push(c);
  var raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

// Validate the nested payload shape (contact + TCPA consent are mandatory).
function validate(p) {
  if (!p || typeof p !== 'object') return 'missing body';
  if (!isStr(p.source)) return 'source required';
  var c = p.contact;
  if (!c || typeof c !== 'object') return 'contact required';
  if (!isStr(c.first_name)) return 'contact.first_name required';
  if (!isStr(c.last_name)) return 'contact.last_name required';
  if (!isStr(c.email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) return 'valid contact.email required';
  if (!isStr(c.phone)) return 'contact.phone required';
  var con = p.consent;
  if (!con || typeof con !== 'object') return 'consent required';
  if (con.tcpa !== true) return 'consent.tcpa must be true';
  if (!isStr(con.text)) return 'consent.text required';
  return null;
}

async function forwardOnce(url, body) {
  var ac = new AbortController();
  var timer = setTimeout(function () { ac.abort(); }, FORWARD_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ac.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  var ip = clientIp(req);
  if (rateLimited(ip)) {
    return res.status(429).json({ ok: false, error: 'rate_limited' });
  }

  var payload = await readJson(req);
  if (!payload) {
    return res.status(400).json({ ok: false, error: 'invalid_payload', detail: 'unparseable body' });
  }

  // Honeypot: bots fill company_website. Look successful, forward nothing.
  if (isStr(payload.company_website)) {
    return res.status(200).json({ ok: true, dropped: true });
  }

  var err = validate(payload);
  if (err) {
    return res.status(400).json({ ok: false, error: 'invalid_payload', detail: err });
  }

  // Server-side enrichment. TCPA requires IP + timestamp stored WITH the consent string.
  var enriched = Object.assign({}, payload, {
    server: {
      received_at: new Date().toISOString(),
      ip: ip,
      user_agent: req.headers['user-agent'] || null
    }
  });

  var webhook = process.env.GHL_WEBHOOK_URL;
  if (!webhook) {
    // Do not lose the lead: log full payload at error level, return 200 with a flag.
    console.error('[lead] GHL_WEBHOOK_URL unset — not forwarded; logging for recovery: ' + JSON.stringify(enriched));
    return res.status(200).json({ ok: true, forwarded: false, stored: 'log' });
  }

  // Forward with 8s timeout + one retry (2 attempts total).
  var lastErr = null;
  for (var i = 0; i < 2; i++) {
    try {
      var r = await forwardOnce(webhook, enriched);
      if (r.ok) return res.status(200).json({ ok: true, forwarded: true });
      lastErr = 'status ' + r.status;
    } catch (e) {
      lastErr = (e && e.name === 'AbortError') ? 'timeout' : ((e && e.message) || 'fetch_error');
    }
  }

  // GHL failed: log the payload so the lead is recoverable, return 502 so the
  // form shows a real error (with the phone-number fallback).
  console.error('[lead] GHL forward failed (' + lastErr + '); logging for recovery: ' + JSON.stringify(enriched));
  return res.status(502).json({ ok: false, error: 'forward_failed' });
};
