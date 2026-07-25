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

// GHL's merge-tag parser can't resolve nested dot-notation (contact.email),
// so the contact arrives with no email/phone and gets rejected. Flatten to a
// one-level map with underscore joins for the wire only — our logs keep the
// nested shape. Every key is sent even when empty: GHL only exposes keys it
// has actually received, so omitting empties makes fields vanish from mapping.
// Booleans and numbers are stringified.
// Stringify one scalar for a GHL field. null/undefined -> '' (send the key
// anyway; GHL only exposes keys it has seen). Booleans/numbers stringified.
// An object/array reaching here means a mapping points at a nested block
// instead of a scalar — the exact bug that let a silent "[object Object]"
// land in a CRM field and read as real data. Warn (with the key) and emit ''.
function ghlStr(v, key) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    console.warn('[lead] flattenForGhl: non-scalar value for "' + (key || '?') +
      '" — emitting empty string instead of "[object Object]"');
    return '';
  }
  return String(v); // booleans, numbers
}

// Overall eligibility from calc.eligibility's two gates (income_limit + second).
// PENDING DOMINATES: any gate still pending -> whole thing 'pending'. We never
// report 'fail' just because a config table isn't loaded yet. Only when both
// gates hold real numeric limits do we settle to 'pass' / 'fail'. Notes carry
// a short human reason ('' on a clean pass).
function eligibilityStatus(e) {
  if (!e || typeof e !== 'object') return { status: 'pending', notes: 'eligibility not evaluated' };
  var gates = [e.income_limit, e.second];
  if (gates.indexOf('pending') !== -1) {
    var notes;
    if (e.funding_option === 'bond') {
      notes = 'Bond limits pending verification';
    } else {
      var p = [];
      if (e.income_limit === 'pending') p.push('income limit');
      if (e.second === 'pending') p.push('loan limit');
      notes = (p.length ? p.join(' and ') : 'eligibility') + ' pending verification';
    }
    return { status: 'pending', notes: notes };
  }
  if (gates.indexOf('fail') !== -1) {
    var reasons = [];
    if (e.income_limit === 'fail') reasons.push('income over county limit');
    if (e.second === 'fail') {
      reasons.push(e.second_kind === 'purchase_price'
        ? 'purchase price over county limit'
        : 'first mortgage over county maximum loan');
    }
    return { status: 'fail', notes: reasons.join('; ') };
  }
  return { status: 'pass', notes: '' };
}

function flattenForGhl(p) {
  var c = p.contact || {};
  var pr = p.profile || {};
  var calc = p.calculator || {};
  var con = p.consent || {};
  var srv = p.server || {};
  var m = p.meta || {};

  // The calculator block is nested (see js/calculator-ui.js buildPayload):
  // inputs.*, a scalar dpa, and monthly/dti/cash_to_close/eligibility objects.
  // Reach into the paths the UI actually emits and pull one scalar from each.
  var ci = calc.inputs || {};
  var monthly = calc.monthly || {};
  var cash = calc.cash_to_close || {};
  // DTI: back-end ratio as a percentage rounded to one decimal (e.g. 41.8).
  var dtiBack = (calc.dti && typeof calc.dti.back === 'number' && isFinite(calc.dti.back))
    ? Math.round(calc.dti.back * 10) / 10
    : null;
  var elig = eligibilityStatus(calc.eligibility);

  return {
    // Already top-level — kept as-is.
    source: ghlStr(p.source, 'source'),
    page_url: ghlStr(p.page_url, 'page_url'),
    submitted_at: ghlStr(p.submitted_at, 'submitted_at'),

    first_name: ghlStr(c.first_name, 'first_name'),
    last_name: ghlStr(c.last_name, 'last_name'),
    email: ghlStr(c.email, 'email'),
    phone: ghlStr(c.phone, 'phone'),

    occupation: ghlStr(pr.occupation, 'occupation'),
    county: ghlStr(pr.county, 'county'),
    timeline: ghlStr(pr.timeline, 'timeline'),

    calculator_purchase_price: ghlStr(ci.price, 'calculator_purchase_price'),
    calculator_loan_type: ghlStr(ci.loan_type, 'calculator_loan_type'),
    calculator_funding_option: ghlStr(calc.funding_option, 'calculator_funding_option'),
    calculator_estimated_assistance: ghlStr(calc.dpa, 'calculator_estimated_assistance'),
    calculator_estimated_monthly: ghlStr(monthly.total_piti, 'calculator_estimated_monthly'),
    // Total cash due at closing after HTH assistance is applied.
    calculator_cash_to_close: ghlStr(cash.estimated_cash_to_close, 'calculator_cash_to_close'),
    calculator_dti: ghlStr(dtiBack, 'calculator_dti'),
    calculator_eligible: ghlStr(elig.status, 'calculator_eligible'),
    calculator_eligibility_notes: ghlStr(elig.notes, 'calculator_eligibility_notes'),

    consent_tcpa: ghlStr(con.tcpa, 'consent_tcpa'),
    consent_text: ghlStr(con.text, 'consent_text'),
    // Calculator form only. Non-calculator forms send neither key, so these
    // flatten to '' — a blank is "not offered", not an opt-in.
    consent_email_opt_in: ghlStr(con.email_opt_in, 'consent_email_opt_in'),
    consent_email_opt_in_text: ghlStr(con.email_opt_in_text, 'consent_email_opt_in_text'),

    server_received_at: ghlStr(srv.received_at, 'server_received_at'),
    server_ip: ghlStr(srv.ip, 'server_ip'),
    server_user_agent: ghlStr(srv.user_agent, 'server_user_agent'),

    utm_source: ghlStr(m.utm_source, 'utm_source'),
    utm_medium: ghlStr(m.utm_medium, 'utm_medium'),
    utm_campaign: ghlStr(m.utm_campaign, 'utm_campaign'),
    gclid: ghlStr(m.gclid, 'gclid'),
    referrer: ghlStr(m.referrer, 'referrer'),
    src: ghlStr(m.src, 'src')
  };
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

  // Flatten only what goes over the wire; `enriched` stays nested for our logs.
  var ghlBody = flattenForGhl(enriched);

  // Forward with 8s timeout + one retry (2 attempts total).
  var lastErr = null;
  for (var i = 0; i < 2; i++) {
    try {
      var r = await forwardOnce(webhook, ghlBody);
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

// Exposed for unit tests only. Vercel invokes module.exports as the request
// handler; these extra properties on the function are inert at runtime.
module.exports.flattenForGhl = flattenForGhl;
module.exports.eligibilityStatus = eligibilityStatus;
