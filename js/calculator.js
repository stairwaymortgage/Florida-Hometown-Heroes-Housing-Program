/* ============================================================
   calculator.js — Hometown Heroes estimate math (pure, no UI, no DOM)

   DPA RULE: assistance = 5% of the FIRST MORTGAGE (purchase price minus
   base/minimum down payment), clamped to [min, max] (10,000 / 35,000).
   ROUNDING: intermediate math stays full-precision; the final DPA is
   FLOORED to whole dollars — never rounded up (a lead-gen estimate must
   not overstate assistance).

   Full estimate adds monthly P&I, MI by loan type, taxes, insurance, HOA,
   total PITI, and DTI. The DPA is a REPAYABLE SECOND MORTGAGE that is
   deferred: it contributes $0/month and $0 to DTI.

   Eligibility gates (income limit, purchase-price cap) read from config
   and return 'pending' when the table is empty — they never block a calc.

   Config is injected so this stays pure/testable.
   Node:    var calc = require('./js/calculator.js')
   Browser: FHTH.calc.estimate(config, input)
   ============================================================ */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.FHTH = root.FHTH || {}; root.FHTH.calc = api; }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  function round2(n) { return Math.round(n * 100) / 100; }
  function num(n) { var v = parseFloat(n); return isFinite(v) ? v : 0; }

  function loanType(config, key) {
    var lt = config.loan_types && config.loan_types[key];
    if (!lt) throw new Error('Unknown loan type: ' + key);
    return lt;
  }

  function firstMortgage(config, price, key) {
    return round2(price - price * loanType(config, key).min_down_pct);
  }

  /* DPA breakdown — the repayable second mortgage. */
  function dpaBreakdown(config, price, key) {
    if (!(price > 0)) throw new Error('Purchase price must be a positive number.');
    var band = config.dpa;
    var pct = loanType(config, key).min_down_pct;
    var baseDown = price * pct;                 // full precision
    var fm = price - baseDown;                  // first mortgage
    var raw = fm * band.pct;                    // 5% of first mortgage
    var clamped = Math.min(band.max, Math.max(band.min, raw));
    var dpa = Math.floor(round2(clamped));      // FLOOR to whole dollars (never up)
    var hit = clamped >= band.max ? 'ceiling' : (clamped <= band.min ? 'floor' : null);
    return {
      purchase_price: round2(price),
      loan_type: key,
      base_down_pct: pct,
      base_down: round2(baseDown),
      first_mortgage: round2(fm),
      dpa_uncapped: round2(raw),
      dpa: dpa,
      clamp: hit
    };
  }

  function dpa(config, price, key) { return dpaBreakdown(config, price, key).dpa; }

  function amortize(principal, annualRatePct, termYears) {
    var n = Math.round(termYears * 12);
    var r = num(annualRatePct) / 100 / 12;
    if (!(principal > 0) || n <= 0) return 0;
    if (r === 0) return principal / n;
    return principal * r / (1 - Math.pow(1 + r, -n));
  }

  /* Eligibility gate: reads a config table; empty table (or no input to
     test) -> 'pending'. Never throws, never blocks the calculation. */
  function gate(threshold, value) {
    if (threshold == null) return 'pending';
    if (!(value > 0)) return 'pending';
    return value <= threshold ? 'pass' : 'fail';
  }
  function eligibility(config, o) {
    o = o || {};
    var inc = config.county_income_limits || {};
    var cap = config.purchase_price_caps || {};
    var limit = (o.county && Object.prototype.hasOwnProperty.call(inc, o.county)) ? inc[o.county] : null;
    var priceCap = (o.county && Object.prototype.hasOwnProperty.call(cap, o.county)) ? cap[o.county] : null;
    return {
      income_limit: gate(limit, num(o.annual_income)),
      purchase_price_cap: gate(priceCap, num(o.price)),
      income_limit_value: (limit == null ? null : limit),
      purchase_price_cap_value: (priceCap == null ? null : priceCap)
    };
  }

  /* Full estimate. */
  function estimate(config, input) {
    input = input || {};
    var b = dpaBreakdown(config, input.price, input.loan_type);
    var lt = loanType(config, input.loan_type);
    var P = b.first_mortgage;
    var termYears = input.term_years || 30;

    var pi = amortize(P, input.interest_rate, termYears);
    var monthlyMI = P * (lt.mi && lt.mi.annual_pct || 0) / 12;
    var upfrontMI = P * (lt.mi && lt.mi.upfront_pct || 0);
    var monthlyTax = num(input.annual_tax) / 12;
    var monthlyIns = num(input.annual_insurance) / 12;
    var monthlyHOA = num(input.monthly_hoa);
    var piti = pi + monthlyMI + monthlyTax + monthlyIns + monthlyHOA;

    var grossMonthly = num(input.annual_income) / 12;
    var monthlyDebts = num(input.monthly_debts);
    var frontDTI = grossMonthly > 0 ? (piti / grossMonthly) * 100 : null;
    var backDTI = grossMonthly > 0 ? ((piti + monthlyDebts) / grossMonthly) * 100 : null;

    return {
      dpa: b,                                   // repayable second mortgage
      first_mortgage: P,
      base_down: b.base_down,
      monthly: {
        principal_interest: round2(pi),
        mortgage_insurance: round2(monthlyMI),
        taxes: round2(monthlyTax),
        insurance: round2(monthlyIns),
        hoa: round2(monthlyHOA),
        total_piti: round2(piti),
        dpa_second: 0                           // deferred — $0/month
      },
      upfront_mortgage_insurance: round2(upfrontMI),
      dti: {
        front: frontDTI == null ? null : round2(frontDTI),
        back: backDTI == null ? null : round2(backDTI),
        dpa_contribution: 0                     // repayable 2nd adds $0 to DTI
      },
      eligibility: eligibility(config, { county: input.county, annual_income: input.annual_income, price: input.price })
    };
  }

  return {
    dpaBreakdown: dpaBreakdown,
    dpa: dpa,
    firstMortgage: firstMortgage,
    eligibility: eligibility,
    estimate: estimate
  };
});
