/* ============================================================
   calculator.test.js  —  run: node test/calculator.test.js
   The 6 CLAUDE.md cases (4 DPA math + 2 eligibility gates), plus schema
   coverage: config-derived rates (TBA/Bond) and null-MI handling.
   ============================================================ */
var assert = require('assert');
var calc = require('../js/calculator.js');
var config = require('../config/program-2026.json');

var pass = 0;
function eq(name, got, want) {
  assert.strictEqual(got, want, name + ' — got ' + got + ', want ' + want);
  console.log('  ok  ' + name + '  = ' + got);
  pass++;
}

console.log('Hometown Heroes calculator — CLAUDE.md cases + 2026 schema\n');

// --- DPA math (basis: 5% of the base first mortgage, floored) ---
eq('1. $320k first mortgage (VA) -> 16000', calc.dpa(config, 320000, 'va'), 16000);
eq('2. $150k FHA -> floor 10000', calc.dpa(config, 150000, 'fha'), 10000);
eq('2. clamp flagged floor', calc.dpaBreakdown(config, 150000, 'fha').clamp, 'floor');
eq('3. $300k FHA -> 14475', calc.dpa(config, 300000, 'fha'), 14475);
eq('4. $800k conventional -> ceiling 35000', calc.dpa(config, 800000, 'conventional_hfa_advantage'), 35000);
eq('4. clamp flagged ceiling', calc.dpaBreakdown(config, 800000, 'conventional_hfa_advantage').clamp, 'ceiling');
eq('floor-not-round: $310k FHA -> 14957', calc.dpa(config, 310000, 'fha'), 14957);

// --- Eligibility gates: TBA populated (live), Bond still pending ---
var eP = calc.eligibility(config, { funding_option: 'tba', loan_type: 'fha', county: 'Orange', annual_income: 95000, price: 300000, first_mortgage: 289500 });
eq('5. TBA FHA income 95k <= Orange 172350 -> pass', eP.income_limit, 'pass');
eq('5. TBA FHA first mtg 289500 <= 541287 -> pass', eP.second, 'pass');
eq('6. TBA FHA income 250k -> fail', calc.eligibility(config, { funding_option: 'tba', loan_type: 'fha', county: 'Orange', annual_income: 250000, first_mortgage: 289500 }).income_limit, 'fail');
var eU = calc.eligibility(config, { funding_option: 'tba', loan_type: 'usda', county: 'Orange', annual_income: 125000, first_mortgage: 300000 });
eq('TBA USDA uses lower USDA limit -> 125k > 119850 fail', eU.income_limit, 'fail');
eq('TBA USDA loan limit not published -> pending', eU.second, 'pending');
var eB = calc.eligibility(config, { funding_option: 'bond', loan_type: 'fha', county: 'Orange', annual_income: 95000, price: 300000, first_mortgage: 289500 });
eq('Bond income -> pending (table empty)', eB.income_limit, 'pending');
eq('Bond price -> pending (table empty)', eB.second, 'pending');
eq('no county -> income pending', calc.eligibility(config, { funding_option: 'tba', loan_type: 'fha', annual_income: 95000, first_mortgage: 289500 }).income_limit, 'pending');

// --- Rates pulled from the matching block ---
eq('rate TBA government (fha)  -> 0.065',  calc.rateFor(config, 'tba', 'fha'), 0.065);
eq('rate Bond government (fha) -> 0.0625', calc.rateFor(config, 'bond', 'fha'), 0.0625);
eq('rate TBA HFA Advantage     -> 0.0675', calc.rateFor(config, 'tba', 'conventional_hfa_advantage'), 0.0675);
eq('rate Bond HFA Advantage    -> 0.065',  calc.rateFor(config, 'bond', 'conventional_hfa_advantage'), 0.065);
eq('funding "not sure" -> TBA rate', calc.rateFor(config, 'not_sure', 'fha'), 0.065);

// --- Full estimate: MI is null (unverified) -> not fabricated ---
var est = calc.estimate(config, { price: 300000, loan_type: 'fha', funding_option: 'tba', annual_tax: 3300, annual_insurance: 2400, monthly_hoa: 0, annual_income: 90000, monthly_debts: 450 });
eq('estimate rate = TBA gov 0.065', est.rate, 0.065);
eq('estimate MI null (unverified)', est.monthly.mortgage_insurance, null);
eq('estimate mi_estimated false', est.monthly.mi_estimated, false);
eq('estimate DPA second $0/mo', est.monthly.dpa_second, 0);
eq('estimate DPA adds $0 to DTI', est.dti.dpa_contribution, 0);
assert.ok(est.monthly.principal_interest > 0, 'P&I computed');
assert.ok(est.dti.back > est.dti.front, 'back-end DTI includes debts');

// Cash to close: $300k FHA -> down 10500 + fees 760 = 11260; DPA 14475 covers it -> $0.
eq('cash: lender fees total = 760', est.cash_to_close.fees.lender_total, 760);
eq('cash: origination charged = 0 (1% waived)', est.cash_to_close.origination_charged, 0);
eq('cash: doc stamp/intangible exempt', est.cash_to_close.doc_stamp_intangible_exempt, true);
eq('cash: to-close = 0 (assistance exceeds it)', est.cash_to_close.estimated_cash_to_close, 0);

// Guards
assert.throws(function () { calc.dpaBreakdown(config, 0, 'fha'); }, /positive/);
assert.throws(function () { calc.dpaBreakdown(config, 300000, 'xyz'); }, /Unknown loan type/);
console.log('  ok  guards: bad price + bad loan type throw');

// --- DPA basis flag (dpa.basis_includes_financed_mi): safe default is false ---
var bDefault = calc.dpaBreakdown(config, 300000, 'fha');
eq('basis flag default false', bDefault.dpa_basis_includes_financed_mi, false);
eq('basis = base first mortgage when false', bDefault.dpa_basis, 289500);
eq('DPA off base loan unchanged = 14475', bDefault.dpa, 14475);
// Flip the ONE boolean -> DPA computes off the financed loan (base + upfront MI).
var cfgFinanced = JSON.parse(JSON.stringify(config));
cfgFinanced.dpa.basis_includes_financed_mi = true;         // fha.ufmip_pct already 0.0175
var bFin = calc.dpaBreakdown(cfgFinanced, 300000, 'fha');
var expBasis = 289500 + 289500 * 0.0175;                   // = 294566.25
eq('basis flag true reported', bFin.dpa_basis_includes_financed_mi, true);
eq('basis = base + financed UFMIP when true', bFin.dpa_basis, Math.round(expBasis * 100) / 100);
assert.ok(bFin.dpa > bDefault.dpa, 'financed-MI basis yields a higher DPA than base (' + bFin.dpa + ' > ' + bDefault.dpa + ')');
console.log('  ok  basis flag true -> DPA off financed loan = ' + bFin.dpa + ' (vs base ' + bDefault.dpa + ')');
pass++;
// If the flag is true but the upfront-MI % is null, basis falls back to base loan.
var cfgFinNoMi = JSON.parse(JSON.stringify(config));
cfgFinNoMi.dpa.basis_includes_financed_mi = true;
cfgFinNoMi.loan_types.va.funding_fee_pct = null;           // already null; explicit
eq('flag true + null upfront % -> basis = base loan', calc.dpaBreakdown(cfgFinNoMi, 320000, 'va').dpa_basis, 320000);

// --- Bond eligibility: empty table pending; lights up when a county block is added ---
var eBondEmpty = calc.eligibility(config, { funding_option: 'bond', loan_type: 'fha', county: 'Orange', annual_income: 95000, price: 300000 });
eq('Bond income pending when no county block', eBondEmpty.income_limit, 'pending');
eq('Bond price pending when no county block', eBondEmpty.second, 'pending');
// Populate one county with positive (test-only) values -> gate uses them.
var cfgBond = JSON.parse(JSON.stringify(config));
cfgBond.income_limits_bond['Orange'] = {
  income_non_targeted_1_2_person: 120000, income_non_targeted_3_plus_person: 138000,
  income_targeted_1_2_person: 144000, income_targeted_3_plus_person: 168000,
  usda_1_2_person: 110000, usda_3_plus_person: 145000,
  purchase_price_non_targeted: 350000, purchase_price_targeted: 428000
};
eq('Bond income 95k <= 120k -> pass', calc.eligibility(cfgBond, { funding_option: 'bond', loan_type: 'fha', county: 'Orange', annual_income: 95000, price: 300000 }).income_limit, 'pass');
eq('Bond income 130k > 120k -> fail', calc.eligibility(cfgBond, { funding_option: 'bond', loan_type: 'fha', county: 'Orange', annual_income: 130000, price: 300000 }).income_limit, 'fail');
eq('Bond price 300k <= 350k -> pass', calc.eligibility(cfgBond, { funding_option: 'bond', loan_type: 'fha', county: 'Orange', annual_income: 95000, price: 300000 }).second, 'pass');
eq('Bond price 400k > 350k -> fail', calc.eligibility(cfgBond, { funding_option: 'bond', loan_type: 'fha', county: 'Orange', annual_income: 95000, price: 400000 }).second, 'fail');
eq('Bond USDA uses USDA column (95k <= 110k pass)', calc.eligibility(cfgBond, { funding_option: 'bond', loan_type: 'usda', county: 'Orange', annual_income: 95000, price: 300000 }).income_limit, 'pass');
// A county copied from _TEMPLATE but left at 0 stays pending (0 is never a real cap).
cfgBond.income_limits_bond['Lee'] = JSON.parse(JSON.stringify(config.income_limits_bond._TEMPLATE));
eq('Bond zero-placeholder county still pending', calc.eligibility(cfgBond, { funding_option: 'bond', loan_type: 'fha', county: 'Lee', annual_income: 95000, price: 300000 }).income_limit, 'pending');

// --- flattenForGhl: the flat scalar map GHL actually receives over the wire ---
var lead = require('../api/lead.js');

// Reproduce the nested `calculator` block that js/calculator-ui.js emits.
function buildCalcBlock(cfg, input) {
  var e = calc.estimate(cfg, input);
  return {
    inputs: input,
    funding_option: e.funding_option,
    rate: e.rate,
    min_down_display: cfg.loan_types[input.loan_type].min_down_pct * 100,
    dpa: e.dpa.dpa,
    dpa_clamp: e.dpa.clamp,
    first_mortgage: e.first_mortgage,
    base_down: e.base_down,
    monthly: e.monthly,
    upfront_mortgage_insurance: e.upfront_mortgage_insurance,
    dti: e.dti,
    cash_to_close: e.cash_to_close,
    eligibility: e.eligibility
  };
}

function assertAllStrings(obj, label) {
  Object.keys(obj).forEach(function (k) {
    assert.strictEqual(typeof obj[k], 'string', label + '.' + k + ' must be a string, got ' + typeof obj[k]);
    assert.notStrictEqual(obj[k], '[object Object]', label + '.' + k + ' is a silent stringified object');
  });
}

var cb = buildCalcBlock(config, {
  price: 300000, loan_type: 'fha', funding_option: 'tba', term_years: 30,
  annual_tax: 4200, annual_insurance: 2400, monthly_hoa: 150,
  annual_income: 85000, monthly_debts: 600, county: 'Orange'
});
var flat = lead.flattenForGhl({
  source: 'calculator',
  page_url: 'https://x/loan-calculator',
  submitted_at: '2026-07-24T15:30:00.000Z',
  contact: { first_name: 'Maria', last_name: 'Gonzalez', email: 'maria@example.com', phone: '(407) 555-0142' },
  profile: { occupation: null, county: 'Orange', timeline: null },
  calculator: cb,
  consent: { tcpa: true, text: 'consent string' },
  server: { received_at: '2026-07-24T15:30:00.512Z', ip: '203.0.113.77', user_agent: 'UA' },
  meta: { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'c', gclid: 'g', referrer: 'r', src: 's' }
});

// The core guarantee: every value is a string, none is a silent "[object Object]".
assertAllStrings(flat, 'flat');
console.log('  ok  flattenForGhl: all ' + Object.keys(flat).length + ' values are strings, none "[object Object]"');
pass++;

// The calculator fields now carry real data (previously blank / "[object Object]").
eq('flat purchase_price <- inputs.price', flat.calculator_purchase_price, '300000');
eq('flat loan_type <- inputs.loan_type', flat.calculator_loan_type, 'fha');
eq('flat funding_option', flat.calculator_funding_option, 'tba');
eq('flat estimated_assistance <- dpa', flat.calculator_estimated_assistance, String(cb.dpa));
eq('flat estimated_monthly <- monthly.total_piti', flat.calculator_estimated_monthly, String(cb.monthly.total_piti));
eq('flat cash_to_close <- estimated_cash_to_close', flat.calculator_cash_to_close, String(cb.cash_to_close.estimated_cash_to_close));
eq('flat dti <- dti.back rounded 1dp', flat.calculator_dti, String(Math.round(cb.dti.back * 10) / 10));
eq('flat eligible (TBA FHA both gates pass)', flat.calculator_eligible, 'pass');
eq('flat eligibility_notes empty on clean pass', flat.calculator_eligibility_notes, '');

// eligibilityStatus: pending dominates fail; never "fail" on an unloaded table.
eq('elig pending dominates a genuine fail', lead.eligibilityStatus({ funding_option: 'tba', income_limit: 'fail', second: 'pending' }).status, 'pending');
eq('elig both gates pass -> pass', lead.eligibilityStatus({ funding_option: 'tba', income_limit: 'pass', second: 'pass' }).status, 'pass');
eq('elig income fail -> fail', lead.eligibilityStatus({ funding_option: 'tba', income_limit: 'fail', second: 'pass' }).status, 'fail');
eq('elig income fail note', lead.eligibilityStatus({ funding_option: 'tba', income_limit: 'fail', second: 'pass' }).notes, 'income over county limit');
eq('elig Bond pending note', lead.eligibilityStatus({ funding_option: 'bond', income_limit: 'pending', second: 'pending' }).notes, 'Bond limits pending verification');

// Hardening: an object landing in a scalar slot -> '' + warning, never "[object Object]".
var badFlat = lead.flattenForGhl({ source: 'calculator', contact: { email: {} }, calculator: { inputs: { price: {} } } });
assertAllStrings(badFlat, 'badFlat');
eq('guard: object email -> empty', badFlat.email, '');
eq('guard: object price -> empty', badFlat.calculator_purchase_price, '');

console.log('\n' + pass + ' assertions passed.\n');

console.log('DPA breakdown:');
[[320000, 'va'], [150000, 'fha'], [300000, 'fha'], [800000, 'conventional_hfa_advantage']]
  .forEach(function (c) {
    var r = calc.dpaBreakdown(config, c[0], c[1]);
    console.log('  $' + r.purchase_price + '  ' + r.loan_type + '  FM $' + r.first_mortgage +
      '  raw $' + r.dpa_uncapped + '  DPA $' + r.dpa + '  ' + (r.clamp || '-'));
  });
console.log('\nEstimate ($300k FHA / TBA @' + (est.rate * 100).toFixed(3) + '%): P&I $' +
  est.monthly.principal_interest + '  PITI $' + est.monthly.total_piti +
  '  MI ' + (est.monthly.mortgage_insurance == null ? '(lender-confirmed)' : '$' + est.monthly.mortgage_insurance) +
  '  DTI ' + est.dti.front + '% / ' + est.dti.back + '%');
