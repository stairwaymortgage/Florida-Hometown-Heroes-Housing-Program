/* ============================================================
   lead.js — attribution capture + the single network chokepoint
   Exposes: FHTH.postLead(payload)      -> Promise<{ok:boolean}>
            FHTH.getAttribution()       -> { utm_source, utm_medium,
                                             utm_campaign, gclid, referrer }
            FHTH.captureAttribution()   -> persists first-touch attribution
   No bundler: attaches to the window.FHTH namespace.
   ============================================================ */
(function (w) {
  'use strict';
  var NS = w.FHTH = w.FHTH || {};

  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'gclid'];
  var STORE_KEY = 'fhth_attribution';

  function read() {
    try { return JSON.parse(w.sessionStorage.getItem(STORE_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function write(obj) {
    try { w.sessionStorage.setItem(STORE_KEY, JSON.stringify(obj)); } catch (e) {}
  }

  /* Capture UTMs / gclid from the query string on first page load and persist
     them for the whole session. First-touch wins, so attribution survives
     navigation between pages before the user converts. */
  function captureAttribution() {
    var stored = read();
    var params = new w.URLSearchParams(w.location.search);
    var changed = false;

    UTM_KEYS.forEach(function (k) {
      var val = params.get(k);
      if (val && !stored[k]) { stored[k] = val; changed = true; }
    });

    // src = which CTA drove this visit (last-touch: the newest click wins,
    // since a CTA links straight to the form it precedes).
    var src = params.get('src');
    if (src && stored.src !== src) { stored.src = src; changed = true; }

    // First cross-origin referrer only, captured once.
    if (!stored.referrer) {
      var ref = w.document.referrer || '';
      if (ref && ref.indexOf(w.location.origin) !== 0) { stored.referrer = ref; changed = true; }
    }

    if (changed) write(stored);
    return stored;
  }

  function getAttribution() {
    var s = read();
    return {
      utm_source: s.utm_source || null,
      utm_medium: s.utm_medium || null,
      utm_campaign: s.utm_campaign || null,
      gclid: s.gclid || null,
      referrer: s.referrer || null,
      src: s.src || null
    };
  }

  /* The ONE place the site talks to the backend. Every form funnels here.
     POSTs the nested payload to /api/lead. Resolves { ok } so callers can
     surface real success/failure. A 200 (incl. the log-fallback when the
     webhook is unset, and honeypot drops) counts as success; 4xx/5xx and
     network errors resolve { ok:false } so the form shows its error +
     phone-number fallback. */
  function postLead(payload) {
    return w.fetch('/api/lead', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) {
        return { ok: r.ok && body && body.ok !== false, status: r.status, body: body };
      });
    }).catch(function () {
      return { ok: false, status: 0, error: 'network' };
    });
  }

  // Run capture as soon as this script loads on every page.
  captureAttribution();

  NS.captureAttribution = captureAttribution;
  NS.getAttribution = getAttribution;
  NS.postLead = postLead;
})(window);
