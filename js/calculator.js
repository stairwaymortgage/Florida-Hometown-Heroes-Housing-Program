/* ============================================================
   calculator.js — Hometown Heroes DPA math (pure, no UI, no DOM)
   CRITICAL RULE (from build brief):
     Down payment assistance = pct (5%) of the FIRST MORTGAGE amount,
     where first mortgage = purchase price - base (minimum) down payment,
     then clamped to the [min, max] band (10,000 / 35,000).
   Config is injected so this stays pure and testable.

   Node:    var calc = require('./js/calculator.js')
   Browser: FHTH.calc.compute(config, price, loanType)

   NOTE: This implements only the DPA rule stated in the task. Anything
   else the full Calculator Spec may require (MI-based monthly estimate,
   purchase-price-cap / income-limit enforcement, rounding conventions,
   exact output fields) is NOT implemented yet — pending CLAUDE.md.
   ============================================================ */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.FHTH = root.FHTH || {}; root.FHTH.calc = api; }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function round2(n) { return Math.round(n * 100) / 100; }

  function loanType(config, key) {
    var lt = config.loan_types && config.loan_types[key];
    if (!lt) throw new Error('Unknown loan type: ' + key);
    return lt;
  }

  // First mortgage = purchase price minus the base (minimum) down payment.
  function firstMortgage(config, price, key) {
    var pct = loanType(config, key).min_down_pct;
    return round2(price - round2(price * pct));
  }

  // Full breakdown for a given price + loan type.
  function compute(config, price, key) {
    if (!(price > 0)) throw new Error('Purchase price must be a positive number.');
    var band = config.dpa;
    var pct = loanType(config, key).min_down_pct;
    var baseDown = round2(price * pct);
    var fm = round2(price - baseDown);
    var raw = fm * band.pct;                       // 5% of the first mortgage
    var clamped = clamp(raw, band.min, band.max);  // enforce 10k / 35k band
    var dpa = Math.round(clamped);                 // assistance in whole dollars
    var hit = dpa >= band.max ? 'ceiling' : (dpa <= band.min ? 'floor' : null);
    return {
      purchase_price: round2(price),
      loan_type: key,
      base_down_pct: pct,
      base_down: baseDown,
      first_mortgage: fm,
      dpa_uncapped: round2(raw),
      dpa: dpa,
      clamp: hit
    };
  }

  // Convenience: just the assistance dollars.
  function assistance(config, price, key) { return compute(config, price, key).dpa; }

  return {
    compute: compute,
    assistance: assistance,
    firstMortgage: firstMortgage
  };
});
