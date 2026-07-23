/* ============================================================
   calculator.test.js  —  run: node test/calculator.test.js
   The 6 cases per CLAUDE.md (reconstructed from owner's answers, since
   CLAUDE.md is currently empty): 4 DPA-math cases + 2 eligibility gates.
   Cases 1-4 verified correct earlier; #2 corrected to $150k FHA.
   Cases 5-6 are eligibility gates -> pending until county tables land.
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

console.log('Hometown Heroes calculator — CLAUDE.md cases\n');

// 1. SANITY: a $320,000 first mortgage -> $16,000 (VA = 0% down, so price == FM).
eq('1. $320k first mortgage (VA) -> 16000', calc.dpa(config, 320000, 'va'), 16000);

// 2. FLOOR: $150k FHA -> base down $5,250 -> FM $144,750 -> 5% = $7,237.50 -> floors to 10000.
eq('2. $150k FHA -> floor 10000', calc.dpa(config, 150000, 'fha'), 10000);
eq('2. clamp flagged floor', calc.dpaBreakdown(config, 150000, 'fha').clamp, 'floor');

// 3. MID-BAND: $300k FHA -> FM $289,500 -> 5% = $14,475.
eq('3. $300k FHA -> 14475', calc.dpa(config, 300000, 'fha'), 14475);

// 4. CEILING: $800k conventional -> FM $776,000 -> 5% = $38,800 -> caps to 35000.
eq('4. $800k conv -> ceiling 35000', calc.dpa(config, 800000, 'conv'), 35000);
eq('4. clamp flagged ceiling', calc.dpaBreakdown(config, 800000, 'conv').clamp, 'ceiling');

// 5. ELIGIBILITY GATE — income limit: county tables empty -> pending (never blocks).
eq('5. income-limit gate -> pending', calc.eligibility(config, { county: 'Orange', annual_income: 95000, price: 300000 }).income_limit, 'pending');

// 6. ELIGIBILITY GATE — purchase-price cap: tables empty -> pending.
eq('6. price-cap gate -> pending', calc.eligibility(config, { county: 'Orange', annual_income: 95000, price: 300000 }).purchase_price_cap, 'pending');

// FLOOR behaviour (proves floor, not round): $310k FHA -> FM $299,150 -> 5% = $14,957.50 -> 14957 (round would give 14958).
eq('floor-not-round: $310k FHA -> 14957', calc.dpa(config, 310000, 'fha'), 14957);

// Full-estimate smoke: DPA is deferred -> $0/month, $0 DTI.
var est = calc.estimate(config, { price: 300000, loan_type: 'fha', interest_rate: 6.375, annual_tax: 3300, annual_insurance: 2400, monthly_hoa: 0, annual_income: 90000, monthly_debts: 450 });
eq('estimate: DPA second is $0/month', est.monthly.dpa_second, 0);
eq('estimate: DPA adds $0 to DTI', est.dti.dpa_contribution, 0);
assert.ok(est.monthly.total_piti > 0, 'PITI computed');
assert.ok(est.dti.back > est.dti.front, 'back-end DTI includes debts');

// Guards
assert.throws(function () { calc.dpaBreakdown(config, 0, 'fha'); }, /positive/);
assert.throws(function () { calc.dpaBreakdown(config, 300000, 'xyz'); }, /Unknown loan type/);
console.log('  ok  guards: bad price + bad loan type throw');

console.log('\n' + pass + ' assertions passed.\n');

console.log('Breakdown (price, loan, base down, first mortgage, 5% raw, DPA, clamp):');
[[320000, 'va'], [150000, 'fha'], [300000, 'fha'], [310000, 'fha'], [800000, 'conv'], [250000, 'va']]
  .forEach(function (c) {
    var r = calc.dpaBreakdown(config, c[0], c[1]);
    console.log('  $' + r.purchase_price + '  ' + r.loan_type.padEnd(4) +
      '  down $' + r.base_down + '  FM $' + r.first_mortgage +
      '  raw $' + r.dpa_uncapped + '  DPA $' + r.dpa + '  ' + (r.clamp || '-'));
  });

console.log('\nMonthly estimate ($300k FHA @6.375%, tax 3300, ins 2400, income 90k, debts 450):');
console.log('  P&I $' + est.monthly.principal_interest + '  MI $' + est.monthly.mortgage_insurance +
  '  Tax $' + est.monthly.taxes + '  Ins $' + est.monthly.insurance +
  '  PITI $' + est.monthly.total_piti + '  DTI ' + est.dti.front + '% / ' + est.dti.back + '%');
