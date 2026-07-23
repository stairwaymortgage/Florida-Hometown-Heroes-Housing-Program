/* ============================================================
   calculator.js — Hometown Heroes estimate math (pure, no UI, no DOM)

   DPA RULE: assistance = dpa.pct (5%) of the loan amount. The 2026 guide
   says "5% of the TOTAL loan amount"; whether "total" includes financed
   UFMIP / funding / guarantee fees is UNVERIFIED (see config _provenance),
   so we compute off the BASE loan (purchase price minus base down payment)
   and label the result an estimate the lender confirms at reservation.
   Clamp to [min, max]; FLOOR the final DPA to whole dollars (never up).

   RATES come from config.rates, chosen by funding option (TBA / Bond) and
   loan type. MI percentages in config are largely null (unverified) — when
   a rate is null we return null and the UI shows "lender-confirmed", never
   a fabricated number.

   Eligibility gates read income_limits_tba / income_limits_bond (by funding
   option) and purchase_price_limits; empty table -> 'pending', never blocks.

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

  var GOV = { fha: 1, usda: 1, va: 1 };

  function loanType(config, key) {
    var lt = config.loan_types && config.loan_types[key];
    if (!lt) throw new Error('Unknown loan type: ' + key);
    return lt;
  }

  // Normalise funding option: anything that isn't 'bond' resolves to TBA (the default).
  function fundingKey(fundingOption) { return fundingOption === 'bond' ? 'hth_bond' : 'hth_tba'; }

  // Pull the first-mortgage rate (decimal) for a funding option + loan type.
  function rateFor(config, fundingOption, loanType, amiTier) {
    var block = config.rates[fundingKey(fundingOption)];
    if (!block) return null;
    if (GOV[loanType]) return block.government_fha_usda_va;
    // conventional_hfa_advantage (Freddie Mac HFA Advantage)
    if (fundingKey(fundingOption) === 'hth_bond') return block.freddie_mac_hfa_advantage;
    return amiTier === 'over_80'
      ? block.freddie_mac_hfa_advantage_over_80_ami
      : block.freddie_mac_hfa_advantage_at_or_below_80_ami;
  }

  // MI percentages differ by loan type and are frequently null (unverified).
  function miPcts(lt) {
    var up = lt.ufmip_pct != null ? lt.ufmip_pct
      : lt.upfront_fee_pct != null ? lt.upfront_fee_pct
        : lt.funding_fee_pct != null ? lt.funding_fee_pct : null;
    var ann = lt.annual_mip_pct != null ? lt.annual_mip_pct
      : lt.annual_fee_pct != null ? lt.annual_fee_pct
        : lt.pmi_pct != null ? lt.pmi_pct : null;
    return { upfront: up, annual: ann };
  }

  function dpaBreakdown(config, price, key) {
    if (!(price > 0)) throw new Error('Purchase price must be a positive number.');
    var band = config.dpa;
    var pct = loanType(config, key).min_down_pct;
    var baseDown = price * pct;                 // full precision
    var fm = price - baseDown;                  // base loan / first mortgage
    var raw = fm * band.pct;                    // dpa.pct of the base loan
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
  function firstMortgage(config, price, key) { return dpaBreakdown(config, price, key).first_mortgage; }

  function amortize(principal, annualRate, termYears) {
    var n = Math.round(termYears * 12);
    var r = num(annualRate) / 12;
    if (!(principal > 0) || n <= 0) return 0;
    if (r === 0) return principal / n;
    return principal * r / (1 - Math.pow(1 + r, -n));
  }

  function gate(threshold, value) {
    if (threshold == null) return 'pending';
    if (!(value > 0)) return 'pending';
    return value <= threshold ? 'pass' : 'fail';
  }

  // Income limits depend on the funding option: TBA and Bond use different tables.
  function eligibility(config, o) {
    o = o || {};
    var incTable = (o.funding_option === 'bond' ? config.income_limits_bond : config.income_limits_tba) || {};
    var capTable = config.purchase_price_limits || {};
    var limit = (o.county && Object.prototype.hasOwnProperty.call(incTable, o.county)) ? incTable[o.county] : null;
    var cap = (o.county && Object.prototype.hasOwnProperty.call(capTable, o.county)) ? capTable[o.county] : null;
    return {
      funding_option: o.funding_option === 'bond' ? 'bond' : 'tba',
      income_limit: gate(limit, num(o.annual_income)),
      purchase_price_cap: gate(cap, num(o.price)),
      income_limit_value: (limit == null ? null : limit),
      purchase_price_cap_value: (cap == null ? null : cap)
    };
  }

  function estimate(config, input) {
    input = input || {};
    var fundingOption = input.funding_option === 'bond' ? 'bond' : 'tba';
    var b = dpaBreakdown(config, input.price, input.loan_type);
    var lt = loanType(config, input.loan_type);
    var mi = miPcts(lt);
    var P = b.first_mortgage;
    var termYears = input.term_years || config.dpa.term_years || 30;

    var rate = rateFor(config, fundingOption, input.loan_type, input.ami_tier); // decimal or null
    var pi = rate != null ? amortize(P, rate, termYears) : null;

    var monthlyMI = mi.annual != null ? P * mi.annual / 12 : null;   // null = lender-confirmed
    var upfrontMI = mi.upfront != null ? P * mi.upfront : null;
    var monthlyTax = num(input.annual_tax) / 12;
    var monthlyIns = num(input.annual_insurance) / 12;
    var monthlyHOA = num(input.monthly_hoa);
    var piti = (pi || 0) + (monthlyMI || 0) + monthlyTax + monthlyIns + monthlyHOA;

    var grossMonthly = num(input.annual_income) / 12;
    var monthlyDebts = num(input.monthly_debts);
    var frontDTI = grossMonthly > 0 && pi != null ? (piti / grossMonthly) * 100 : null;
    var backDTI = grossMonthly > 0 && pi != null ? ((piti + monthlyDebts) / grossMonthly) * 100 : null;

    return {
      funding_option: fundingOption,
      rate: rate,
      dpa: b,
      first_mortgage: P,
      base_down: b.base_down,
      monthly: {
        principal_interest: pi == null ? null : round2(pi),
        mortgage_insurance: monthlyMI == null ? null : round2(monthlyMI),   // null -> lender-confirmed
        taxes: round2(monthlyTax),
        insurance: round2(monthlyIns),
        hoa: round2(monthlyHOA),
        total_piti: round2(piti),
        mi_estimated: monthlyMI != null,
        dpa_second: 0                          // deferred — $0/month
      },
      upfront_mortgage_insurance: upfrontMI == null ? null : round2(upfrontMI),
      dti: {
        front: frontDTI == null ? null : round2(frontDTI),
        back: backDTI == null ? null : round2(backDTI),
        dpa_contribution: 0                    // repayable 2nd adds $0 to DTI
      },
      eligibility: eligibility(config, {
        funding_option: fundingOption, county: input.county,
        annual_income: input.annual_income, price: input.price
      })
    };
  }

  return {
    dpaBreakdown: dpaBreakdown,
    dpa: dpa,
    firstMortgage: firstMortgage,
    rateFor: rateFor,
    eligibility: eligibility,
    estimate: estimate
  };
});
