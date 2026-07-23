/* ============================================================
   calculator.test.js  —  run: node test/calculator.test.js
   PROVISIONAL cases derived from the one stated rule (DPA = 5% of the
   first mortgage, clamped 10k/35k) + the $320k sanity anchor.
   REPLACE with the 6 canonical cases once CLAUDE.md is available.
   ============================================================ */
var assert = require('assert');
var calc = require('../js/calculator.js');
var config = require('../config/program-2026.json');

var pass = 0;
function check(name, got, want) {
  assert.strictEqual(got, want, name + ' — got ' + got + ', want ' + want);
  console.log('  ok  ' + name + '  = ' + got);
  pass++;
}

console.log('DPA calculator — provisional cases\n');

// 1. SANITY ANCHOR: a $320,000 first mortgage -> ~$16,000 assistance.
//    VA has 0% base down, so purchase price == first mortgage.
check('sanity: $320k first mortgage (VA) -> 16000', calc.assistance(config, 320000, 'va'), 16000);
check('sanity: first_mortgage equals price for VA', calc.compute(config, 320000, 'va').first_mortgage, 320000);

// 2. MID-BAND, FHA (3.5% down): 300000 -> FM 289500 -> 5% = 14475.
check('mid-band FHA $300k -> 14475', calc.assistance(config, 300000, 'fha'), 14475);

// 3. CEILING: conventional (3% down) 800000 -> FM 776000 -> 5% = 38800 -> 35000.
check('ceiling conv $800k -> 35000', calc.assistance(config, 800000, 'conv'), 35000);
check('ceiling flagged', calc.compute(config, 800000, 'conv').clamp, 'ceiling');

// 4. FLOOR: FHA 180000 -> FM 173700 -> 5% = 8685 -> 10000.
check('floor FHA $180k -> 10000', calc.assistance(config, 180000, 'fha'), 10000);
check('floor flagged', calc.compute(config, 180000, 'fha').clamp, 'floor');

// 5. VA (0% down) 250000 -> FM 250000 -> 5% = 12500.
check('VA $250k -> 12500', calc.assistance(config, 250000, 'va'), 12500);

// 6. EXACT CEILING BOUNDARY: VA 700000 -> FM 700000 -> 5% = 35000.
check('boundary VA $700k -> 35000', calc.assistance(config, 700000, 'va'), 35000);

// Guards
assert.throws(function () { calc.compute(config, 0, 'fha'); }, /positive/, 'rejects non-positive price');
assert.throws(function () { calc.compute(config, 300000, 'xyz'); }, /Unknown loan type/, 'rejects bad loan type');
console.log('  ok  guards: bad price + bad loan type throw');

console.log('\n' + pass + ' assertions passed.\n');

// --- readable breakdown table for eyeballing the numbers ---
console.log('Breakdown (price, loan, base down, first mortgage, 5% raw, DPA, clamp):');
[[300000,'fha'],[320000,'va'],[450000,'conv'],[180000,'fha'],[800000,'conv'],[250000,'va']]
  .forEach(function (c) {
    var r = calc.compute(config, c[0], c[1]);
    console.log('  $' + r.purchase_price + '  ' + r.loan_type.padEnd(4) +
      '  down $' + r.base_down + '  FM $' + r.first_mortgage +
      '  raw $' + r.dpa_uncapped + '  DPA $' + r.dpa + '  ' + (r.clamp || '-'));
  });
