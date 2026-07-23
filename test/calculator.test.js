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
